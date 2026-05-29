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
  // ─────────────────────────────────────────
  private async gerarMatch(perfil: any, imovel: any, tenantId: string): Promise<boolean> {
    const jaExiste = await this.prisma.match.findUnique({
      where: { perfilId_imovelId: { perfilId: perfil.id, imovelId: imovel.id } },
    })
    if (jaExiste) return false

    const primeiraEtapa = await this.pipelineService.primeiraEtapa(tenantId)

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
        matchId:       match.id,
        tenantId,
        tipo:          'MATCH_CRIADO',
        etapaDestinoId: primeiraEtapa.id,
      },
    })

    await this.notificacoesService.enviarNotificacaoMatch(perfil, imovel)
    this.logger.log(`Match: perfil ${perfil.id} ↔ imóvel ${imovel.id} [etapa: ${primeiraEtapa.nome}]`)
    return true
  }

  // ─────────────────────────────────────────
  // Listagem com filtro de role
  // CORRETOR só vê matches atribuídos a ele
  // ─────────────────────────────────────────
  async listarMatches(
    tenantId: string,
    userId: string,
    userRole: string,
    filters?: { imovelId?: string; perfilId?: string },
  ) {
    const where: any = { tenantId, ...filters }

    if (userRole === 'CORRETOR') {
      where.corretorId = userId
    }

    return this.prisma.match.findMany({
      where,
      include: {
        imovel:   { include: { tipo: true, cidade: true } },
        perfil:   { include: { tipos: true, cliente: true } },
        etapa:    true,
        corretor: { select: CORRETOR_SELECT },
      },
      orderBy: { createdAt: 'desc' },
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
