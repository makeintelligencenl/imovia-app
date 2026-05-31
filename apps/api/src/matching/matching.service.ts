import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { NotificacoesService } from '../notificacoes/notificacoes.service'
import { PipelineService } from '../pipeline/pipeline.service'

const CORRETOR_SELECT = { id: true, name: true, email: true } as const

@Injectable()
export class MatchingService {
  private readonly logger = new Logger(MatchingService.name)

  constructor(
    private prisma: PrismaService,
    private notificacoesService: NotificacoesService,
    private pipelineService: PipelineService,
  ) {}

  // ─────────────────────────────────────────
  // Disparado quando um IMÓVEL é cadastrado
  // ─────────────────────────────────────────
  async executarMatching(tenantId: string, imovelId: string) {
    const imovel = await this.prisma.imovel.findFirst({
      where: { id: imovelId, tenantId, status: 'DISPONIVEL' },
      include: { cidade: true },
    })
    if (!imovel) return { matchesEncontrados: 0 }

    const perfisCompativeis = await this.prisma.perfilBusca.findMany({
      where: {
        tenantId,
        ativo: true,
        finalidade: imovel.finalidade,
        tipos: { some: { id: imovel.tipoId } },
        precoMin: { lte: imovel.preco },
        precoMax: { gte: imovel.preco },
        areaMin: { lte: imovel.areaM2 },
        cidades: { hasSome: [imovel.cidade.nome] },
        AND: [
          ...(imovel.quartos
            ? [{ OR: [{ quartosMin: null }, { quartosMin: { lte: imovel.quartos } }] }]
            : []),
          {
            OR: [
              { bairros: { equals: null } },
              { bairros: { isEmpty: true } },
              { bairros: { hasSome: [imovel.bairro] } },
            ],
          },
        ],
      },
      include: { tipos: true, cliente: true },
    })

    const resultados = await Promise.all(
      perfisCompativeis.map((perfil) => this.gerarMatch(perfil, imovel, tenantId)),
    )
    const matchesEncontrados = resultados.filter(Boolean).length
    this.logger.log(`[Imóvel ${imovelId}] ${matchesEncontrados} matches gerados`)
    return { matchesEncontrados }
  }

  // ─────────────────────────────────────────
  // Disparado quando um PERFIL é cadastrado
  // ─────────────────────────────────────────
  async executarMatchingParaPerfil(tenantId: string, perfilId: string) {
    const perfil = await this.prisma.perfilBusca.findFirst({
      where: { id: perfilId, tenantId, ativo: true },
      include: { tipos: true, cliente: true },
    })
    if (!perfil) return { matchesEncontrados: 0 }

    const tipoIds = perfil.tipos.map((t) => t.id)

    const imoveisCompativeis = await this.prisma.imovel.findMany({
      where: {
        tenantId,
        status: 'DISPONIVEL',
        finalidade: perfil.finalidade,
        tipoId: { in: tipoIds },
        preco: { gte: perfil.precoMin, lte: perfil.precoMax },
        areaM2: { gte: perfil.areaMin },
        ...(perfil.quartosMin ? { quartos: { gte: perfil.quartosMin } } : {}),
        cidade: { nome: { in: perfil.cidades } },
        ...((perfil.bairros as string[]).length > 0
          ? { bairro: { in: perfil.bairros as string[] } }
          : {}),
      },
    })

    const resultados = await Promise.all(
      imoveisCompativeis.map((imovel) => this.gerarMatch(perfil, imovel, tenantId)),
    )
    const matchesEncontrados = resultados.filter(Boolean).length
    this.logger.log(`[Perfil ${perfilId}] ${matchesEncontrados} matches gerados`)
    return { matchesEncontrados }
  }

  // ─────────────────────────────────────────
  // Cria o match na primeira etapa do pipeline
  // BUG #4: substitui findUnique+create pelo padrão create+catch para eliminar
  // a race condition entre o check e o insert quando imóveis são cadastrados
  // em paralelo pelo mesmo tenant.
  // ─────────────────────────────────────────
  private async gerarMatch(perfil: any, imovel: any, tenantId: string): Promise<boolean> {
    const primeiraEtapa = await this.pipelineService.primeiraEtapa(tenantId)

    try {
      const match = await this.prisma.match.create({
        data: {
          perfilId: perfil.id,
          imovelId: imovel.id,
          tenantId,
          etapaId: primeiraEtapa.id,
        },
      })

      // Registra evento de criação no histórico
      await this.prisma.matchHistorico.create({
        data: {
          matchId:        match.id,
          tenantId,
          tipo:           'MATCH_CRIADO',
          etapaDestinoId: primeiraEtapa.id,
        },
      })

      await this.notificacoesService.enviarNotificacaoMatch(perfil, imovel)
      this.logger.log(`Match: perfil ${perfil.id} ↔ imóvel ${imovel.id} [etapa: ${primeiraEtapa.nome}]`)
      return true
    } catch (err: any) {
      // P2002 = unique constraint violation → match já existe (criado por requisição concorrente)
      if (err?.code === 'P2002') return false
      throw err
    }
  }

  // ─────────────────────────────────────────
  // BUG #5: Verifica matches existentes de um imóvel após atualização
  // e move para "Encerrado" os que não satisfazem mais os critérios do perfil.
  // Mantém histórico completo — não deleta nenhum match.
  // ─────────────────────────────────────────
  async invalidarMatchesIncompativeis(tenantId: string, imovelId: string): Promise<void> {
    const imovel = await this.prisma.imovel.findFirst({
      where: { id: imovelId, tenantId },
      include: { cidade: true },
    })
    if (!imovel) return

    // Usa a última etapa do pipeline como "Encerrado"
    const etapaEncerrada = await this.prisma.pipelineEtapa.findFirst({
      where: { tenantId, ativo: true },
      orderBy: { ordem: 'desc' },
    })
    if (!etapaEncerrada) return

    // Busca matches ainda não encerrados para este imóvel
    const matches = await this.prisma.match.findMany({
      where:   { imovelId, tenantId, etapaId: { not: etapaEncerrada.id } },
      include: { perfil: { include: { tipos: true } } },
    })

    const incompativeis = matches.filter(m => !this.isCompativel(m.perfil, imovel))
    if (incompativeis.length === 0) return

    this.logger.log(`[Imóvel ${imovelId}] Desativando ${incompativeis.length} match(es) incompatíveis após atualização`)

    // Usa $transaction para garantir atomicidade de update + histórico
    await this.prisma.$transaction(
      incompativeis.flatMap(m => [
        this.prisma.match.update({
          where: { id: m.id },
          data:  { etapaId: etapaEncerrada.id },
        }),
        this.prisma.matchHistorico.create({
          data: {
            matchId:        m.id,
            tenantId,
            tipo:           'ETAPA_ALTERADA',
            etapaOrigemId:  m.etapaId,
            etapaDestinoId: etapaEncerrada.id,
          },
        }),
      ]),
    )
  }

  // Verifica se um perfil de busca ainda é compatível com um imóvel atualizado
  private isCompativel(perfil: any, imovel: any): boolean {
    if (perfil.finalidade !== imovel.finalidade) return false
    if (!perfil.tipos.some((t: any) => t.id === imovel.tipoId)) return false
    if (Number(perfil.precoMin) > Number(imovel.preco)) return false
    if (Number(perfil.precoMax) < Number(imovel.preco)) return false
    if (Number(perfil.areaMin) > Number(imovel.areaM2)) return false
    if (!perfil.cidades.includes(imovel.cidade.nome)) return false
    if (imovel.quartos && perfil.quartosMin && Number(perfil.quartosMin) > imovel.quartos) return false
    const bairros = (perfil.bairros ?? []) as string[]
    if (bairros.length > 0 && imovel.bairro && !bairros.includes(imovel.bairro)) return false
    return true
  }

  // ─────────────────────────────────────────
  // Lead Score por match (50–100)
  //
  // Mede a aderência do imóvel ao perfil do cliente,
  // ranqueando matches do mais ao menos compatível.
  //
  // Base:         50 pts  (passou o filtro)
  // Preço:        centralidade no range        até +20
  // Cidade:       especificidade (1→+5, ≤3→+3) até  +5
  // Bairro:       imóvel no bairro preferido   até +10
  // Quartos:      acima (+8) / no mínimo (+4)  até  +8
  // Área:         ≥20% acima (+7) / ≥10% (+4)  até  +7
  // ──────────────────────────────────── total  100
  // ─────────────────────────────────────────
  private computeLeadScore(match: any): number {
    let score = 50

    // Converte Decimal do Prisma para number
    const preco    = Number(match.imovel.preco)
    const precoMin = Number(match.perfil.precoMin)
    const precoMax = Number(match.perfil.precoMax)
    const areaM2   = Number(match.imovel.areaM2)
    const areaMin  = Number(match.perfil.areaMin)

    // 1. Centralidade do preço (até +20)
    const range = precoMax - precoMin
    if (range > 0) {
      const centro    = (precoMin + precoMax) / 2
      const distancia = Math.abs(preco - centro) / (range / 2) // 0=centro, 1=borda
      if      (distancia <= 0.1) score += 20
      else if (distancia <= 0.3) score += 10
      // borda: +0
    } else {
      score += 20 // preço exato (range = 0)
    }

    // 2. Especificidade da cidade (até +5)
    const numCidades = ((match.perfil.cidades ?? []) as string[]).length
    if      (numCidades === 1) score += 5
    else if (numCidades <= 3)  score += 3
    // 4+ cidades: +0

    // 3. Bairro preferido (até +10)
    const bairros = ((match.perfil.bairros ?? []) as string[])
    if (bairros.length > 0 && match.imovel.bairro && bairros.includes(match.imovel.bairro)) {
      score += 10
    }

    // 4. Quartos (até +8)
    const quartosMin: number | null = match.perfil.quartosMin
    const quartos:    number | null = match.imovel.quartos
    if (quartosMin != null && quartos != null) {
      if      (quartos > quartosMin)  score += 8
      else if (quartos === quartosMin) score += 4
    }

    // 5. Área acima do mínimo (até +7)
    if (areaMin > 0) {
      const excedente = (areaM2 - areaMin) / areaMin
      if      (excedente >= 0.20) score += 7
      else if (excedente >= 0.10) score += 4
      // no limite: +0
    }

    return Math.min(100, score)
  }

  // ─────────────────────────────────────────
  // Listagem com filtro de role
  // CORRETOR só vê matches atribuídos a ele
  // ─────────────────────────────────────────
  async listarMatches(
    tenantId: string,
    userId: string,
    userRole: string,
    filters?: { imovelId?: string; perfilId?: string; clienteId?: string; createdAfter?: string },
  ) {
    const { imovelId, perfilId, clienteId, createdAfter } = filters ?? {}

    // Monta o where explicitamente — nunca espalha undefined no objeto
    const where: any = { tenantId }
    if (imovelId)     where.imovelId   = imovelId
    if (perfilId)     where.perfilId   = perfilId
    if (clienteId)    where.perfil     = { clienteId }
    if (createdAfter) where.createdAt  = { gte: new Date(createdAfter) }

    // Filtro de CORRETOR apenas na listagem global (sem contexto de imóvel/perfil/cliente)
    const isContextual = !!(imovelId || perfilId || clienteId)
    if (userRole === 'CORRETOR' && !isContextual) where.corretorId = userId

    const matches = await this.prisma.match.findMany({
      where,
      include: {
        imovel:   { include: { tipo: true, cidade: true } },
        perfil:   { include: { tipos: true, cliente: true } },
        etapa:    true,
        corretor: { select: CORRETOR_SELECT },
      },
      orderBy: { createdAt: 'desc' },
    })

    return matches.map(m => {
      let leadScore = 50
      try { leadScore = this.computeLeadScore(m) } catch (e) {
        this.logger.warn(`computeLeadScore falhou para match ${m.id}: ${e}`)
      }
      return { ...m, leadScore }
    })
  }

  // ─────────────────────────────────────────
  // Mover match para outra etapa
  // ─────────────────────────────────────────
  async moverEtapa(tenantId: string, matchId: string, etapaId: string, userId?: string) {
    const match = await this.prisma.match.findFirst({ where: { id: matchId, tenantId } })
    if (!match) throw new NotFoundException('Match não encontrado')

    const etapa = await this.prisma.pipelineEtapa.findFirst({ where: { id: etapaId, tenantId, ativo: true } })
    if (!etapa) throw new NotFoundException('Etapa não encontrada')

    const etapaOrigemId = match.etapaId

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.match.update({
        where: { id: matchId },
        data:  { etapaId },
        include: {
          etapa:    true,
          corretor: { select: CORRETOR_SELECT },
        },
      })
      await tx.matchHistorico.create({
        data: {
          matchId,
          tenantId,
          tipo:          'ETAPA_ALTERADA',
          etapaOrigemId,
          etapaDestinoId: etapaId,
          userId:         userId ?? null,
        },
      })
      return result
    })

    return updated
  }

  // ─────────────────────────────────────────
  // Associar / desassociar corretor ao match
  // ─────────────────────────────────────────
  async associarCorretor(tenantId: string, matchId: string, corretorId: string | null) {
    const match = await this.prisma.match.findFirst({ where: { id: matchId, tenantId } })
    if (!match) throw new NotFoundException('Match não encontrado')

    if (corretorId) {
      const corretor = await this.prisma.user.findFirst({
        where: { id: corretorId, tenantId, role: 'CORRETOR' },
      })
      if (!corretor) throw new BadRequestException('Corretor não encontrado neste tenant')
    }

    // userId no histórico aponta para o corretor sendo atribuído/removido
    const historicoUserId = corretorId ?? match.corretorId

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.match.update({
        where: { id: matchId },
        data:  { corretorId },
        include: {
          etapa:    true,
          corretor: { select: CORRETOR_SELECT },
        },
      })
      await tx.matchHistorico.create({
        data: {
          matchId,
          tenantId,
          tipo:   corretorId ? 'CORRETOR_ATRIBUIDO' : 'CORRETOR_REMOVIDO',
          userId: historicoUserId ?? null,
        },
      })
      return result
    })

    return updated
  }

  // ─────────────────────────────────────────
  // Histórico de movimentação de um match
  // ─────────────────────────────────────────
  async listarHistorico(tenantId: string, matchId: string) {
    const match = await this.prisma.match.findFirst({ where: { id: matchId, tenantId } })
    if (!match) throw new NotFoundException('Match não encontrado')

    return this.prisma.matchHistorico.findMany({
      where: { matchId },
      include: {
        etapaOrigem:  { select: { id: true, nome: true, cor: true } },
        etapaDestino: { select: { id: true, nome: true, cor: true } },
        usuario:      { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'asc' },
    })
  }
}
