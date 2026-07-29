import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { NotificacoesService } from '../notificacoes/notificacoes.service'
import { PipelineService } from '../pipeline/pipeline.service'
import { ScoringService } from './scoring.service'
import { CompatibilidadeService } from './compatibilidade.service'
import { RelatorioService } from './relatorio.service'
import { ImovelInput, PerfilComCliente } from './types'

const CORRETOR_SELECT = { id: true, name: true, email: true } as const

@Injectable()
export class MatchingService {
  private readonly logger = new Logger(MatchingService.name)

  constructor(
    private prisma:           PrismaService,
    private notificacoes:     NotificacoesService,
    private pipeline:         PipelineService,
    private scoring:          ScoringService,
    private compatibilidade:  CompatibilidadeService,
    private relatorio:        RelatorioService,
  ) {}

  // ─── Disparado quando um IMÓVEL é cadastrado ─────────────────────────────
  async executarMatching(tenantId: string, imovelId: string) {
    const imovel = await this.prisma.imovel.findFirst({
      where:   { id: imovelId, tenantId, status: 'DISPONIVEL' },
      include: { cidade: true },
    })
    if (!imovel) return { matchesEncontrados: 0 }

    const perfisCompativeis = await this.prisma.perfilBusca.findMany({
      where:   { tenantId, ...this.compatibilidade.perfilWhere(imovel) },
      include: { tipos: true, cliente: { select: { email: true, nome: true, telefone: true, corretorId: true } } },
    })

    const resultados = await Promise.all(
      perfisCompativeis.map(perfil => this.gerarMatch(perfil, imovel, tenantId)),
    )
    const matchesEncontrados = resultados.filter(Boolean).length
    this.logger.log(`[Imóvel ${imovelId}] ${matchesEncontrados} matches gerados`)
    return { matchesEncontrados }
  }

  // ─── Disparado quando um PERFIL é cadastrado ─────────────────────────────
  async executarMatchingParaPerfil(tenantId: string, perfilId: string) {
    const perfil = await this.prisma.perfilBusca.findFirst({
      where:   { id: perfilId, tenantId, ativo: true },
      include: { tipos: true, cliente: { select: { email: true, nome: true, telefone: true, corretorId: true } } },
    })
    if (!perfil) return { matchesEncontrados: 0 }

    const imoveisCompativeis = await this.prisma.imovel.findMany({
      where:   { tenantId, ...this.compatibilidade.imovelWhere(perfil) },
      include: { cidade: true },
    })

    const resultados = await Promise.all(
      imoveisCompativeis.map(imovel => this.gerarMatch(perfil, imovel, tenantId)),
    )
    const matchesEncontrados = resultados.filter(Boolean).length
    this.logger.log(`[Perfil ${perfilId}] ${matchesEncontrados} matches gerados`)
    return { matchesEncontrados }
  }

  // ─── Cria o match na primeira etapa — P2002 = concorrência, ignorar ──────
  private async gerarMatch(perfil: PerfilComCliente, imovel: ImovelInput, tenantId: string): Promise<boolean> {
    const primeiraEtapa = await this.pipeline.primeiraEtapa(tenantId)
    const leadScore     = this.scoring.compute({ perfil, imovel })

    try {
      const match = await this.prisma.match.create({
        data: {
          perfilId:   perfil.id,
          imovelId:   imovel.id,
          tenantId,
          etapaId:    primeiraEtapa.id,
          leadScore,
          corretorId: perfil.cliente.corretorId ?? null,
        },
      })
      await this.prisma.matchHistorico.create({
        data: { matchId: match.id, tenantId, tipo: 'MATCH_CRIADO', etapaDestinoId: primeiraEtapa.id },
      })
      await this.notificacoes.enviarNotificacaoMatch(perfil, imovel)
      this.logger.log(`Match: perfil ${perfil.id} ↔ imóvel ${imovel.id} [etapa: ${primeiraEtapa.nome}]`)
      return true
    } catch (err: any) {
      if (err?.code === 'P2002') return false
      throw err
    }
  }

  // ─── Move matches incompatíveis para "Encerrado" após update de imóvel ───
  async invalidarMatchesIncompativeis(tenantId: string, imovelId: string): Promise<void> {
    const imovel = await this.prisma.imovel.findFirst({
      where: { id: imovelId, tenantId }, include: { cidade: true },
    })
    if (!imovel) return

    const etapaEncerrada = await this.prisma.pipelineEtapa.findFirst({
      where: { tenantId, ativo: true, tipo: 'ENCERRADO' },
    }) ?? await this.prisma.pipelineEtapa.findFirst({
      where: { tenantId, ativo: true }, orderBy: { ordem: 'desc' },
    })
    if (!etapaEncerrada) return

    const matches = await this.prisma.match.findMany({
      where:   { imovelId, tenantId, etapaId: { not: etapaEncerrada.id } },
      include: { perfil: { include: { tipos: true } } },
    })

    const incompativeis = matches.filter(m => !this.compatibilidade.isCompativel(m.perfil, imovel))
    if (incompativeis.length === 0) return

    this.logger.log(`[Imóvel ${imovelId}] Desativando ${incompativeis.length} match(es) incompatíveis`)

    await this.prisma.$transaction(
      incompativeis.flatMap(m => [
        this.prisma.match.update({ where: { id: m.id }, data: { etapaId: etapaEncerrada.id } }),
        this.prisma.matchHistorico.create({
          data: { matchId: m.id, tenantId, tipo: 'ETAPA_ALTERADA', etapaOrigemId: m.etapaId, etapaDestinoId: etapaEncerrada.id },
        }),
      ]),
    )
  }

  // ─── Move matches incompatíveis para "Encerrado" após update de perfil ───
  async invalidarMatchesIncompativeisPorPerfil(tenantId: string, perfilId: string): Promise<void> {
    const perfil = await this.prisma.perfilBusca.findFirst({
      where: { id: perfilId, tenantId }, include: { tipos: true },
    })
    if (!perfil) return

    const etapaEncerrada = await this.prisma.pipelineEtapa.findFirst({
      where: { tenantId, ativo: true, tipo: 'ENCERRADO' },
    }) ?? await this.prisma.pipelineEtapa.findFirst({
      where: { tenantId, ativo: true }, orderBy: { ordem: 'desc' },
    })
    if (!etapaEncerrada) return

    const matches = await this.prisma.match.findMany({
      where:   { perfilId, tenantId, etapaId: { not: etapaEncerrada.id } },
      include: { imovel: { include: { cidade: true } } },
    })

    const incompativeis = matches.filter(m => !this.compatibilidade.isCompativel(perfil, m.imovel))
    if (incompativeis.length === 0) return

    this.logger.log(`[Perfil ${perfilId}] Desativando ${incompativeis.length} match(es) incompatíveis`)

    await Promise.all(
      incompativeis.flatMap(m => [
        this.prisma.match.update({ where: { id: m.id }, data: { etapaId: etapaEncerrada.id } }),
        this.prisma.matchHistorico.create({
          data: { matchId: m.id, tenantId, tipo: 'ETAPA_ALTERADA', etapaOrigemId: m.etapaId, etapaDestinoId: etapaEncerrada.id },
        }),
      ]),
    )
  }

  // ─── Recalcula leadScore de todos os matches de um imóvel atualizado ──────
  async recalcularLeadScoresPorImovel(tenantId: string, imovelId: string): Promise<void> {
    const imovel = await this.prisma.imovel.findFirst({
      where: { id: imovelId, tenantId }, include: { cidade: true },
    })
    if (!imovel) return

    const matches = await this.prisma.match.findMany({
      where:   { imovelId, tenantId },
      include: { perfil: { include: { tipos: true } } },
    })
    if (matches.length === 0) return

    await this.prisma.$transaction(
      matches.map(m => {
        const score = this.scoring.compute({ perfil: m.perfil, imovel })
        return this.prisma.match.update({ where: { id: m.id }, data: { leadScore: score } })
      }),
    )
    this.logger.log(`[Imóvel ${imovelId}] leadScore recalculado para ${matches.length} match(es)`)
  }

  // ─── Recalcula leadScore de todos os matches de um perfil atualizado ──────
  async recalcularLeadScoresPorPerfil(tenantId: string, perfilId: string): Promise<void> {
    const perfil = await this.prisma.perfilBusca.findFirst({
      where: { id: perfilId, tenantId }, include: { tipos: true },
    })
    if (!perfil) return

    const matches = await this.prisma.match.findMany({
      where:   { perfilId, tenantId },
      include: { imovel: { include: { cidade: true } } },
    })
    if (matches.length === 0) return

    await this.prisma.$transaction(
      matches.map(m => {
        const score = this.scoring.compute({ perfil, imovel: m.imovel })
        return this.prisma.match.update({ where: { id: m.id }, data: { leadScore: score } })
      }),
    )
    this.logger.log(`[Perfil ${perfilId}] leadScore recalculado para ${matches.length} match(es)`)
  }

  // ─── Listagem com filtro de role ──────────────────────────────────────────
  async listarMatches(
    tenantId: string,
    userId:   string,
    userRole: string,
    filters?: { imovelId?: string; perfilId?: string; clienteId?: string; createdAfter?: string },
  ) {
    const { imovelId, perfilId, clienteId, createdAfter } = filters ?? {}

    const where: any = { tenantId }
    if (imovelId)     where.imovelId  = imovelId
    if (perfilId)     where.perfilId  = perfilId
    if (clienteId)    where.perfil    = { clienteId }
    if (createdAfter) where.createdAt = { gte: new Date(createdAfter) }

    if (userRole === 'CORRETOR') where.corretorId = userId

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

  // ─── Mover match para outra etapa ────────────────────────────────────────
  async moverEtapa(tenantId: string, matchId: string, etapaId: string, userId?: string) {
    const match = await this.prisma.match.findFirst({ where: { id: matchId, tenantId } })
    if (!match) throw new NotFoundException('Match não encontrado')

    const etapa = await this.prisma.pipelineEtapa.findFirst({ where: { id: etapaId, tenantId, ativo: true } })
    if (!etapa) throw new NotFoundException('Etapa não encontrada')

    return this.prisma.$transaction(async (tx) => {
      const result = await tx.match.update({
        where:   { id: matchId },
        data:    { etapaId },
        include: { etapa: true, corretor: { select: CORRETOR_SELECT } },
      })
      await tx.matchHistorico.create({
        data: { matchId, tenantId, tipo: 'ETAPA_ALTERADA', etapaOrigemId: match.etapaId, etapaDestinoId: etapaId, userId: userId ?? null },
      })
      return result
    })
  }

  // ─── Associar / desassociar corretor ao match ─────────────────────────────
  async associarCorretor(tenantId: string, matchId: string, corretorId: string | null) {
    const match = await this.prisma.match.findFirst({ where: { id: matchId, tenantId } })
    if (!match) throw new NotFoundException('Match não encontrado')

    if (corretorId) {
      const corretor = await this.prisma.user.findFirst({ where: { id: corretorId, tenantId, role: 'CORRETOR' } })
      if (!corretor) throw new BadRequestException('Corretor não encontrado neste tenant')
    }

    const historicoUserId = corretorId ?? match.corretorId

    return this.prisma.$transaction(async (tx) => {
      const result = await tx.match.update({
        where:   { id: matchId },
        data:    { corretorId },
        include: { etapa: true, corretor: { select: CORRETOR_SELECT } },
      })
      await tx.matchHistorico.create({
        data: { matchId, tenantId, tipo: corretorId ? 'CORRETOR_ATRIBUIDO' : 'CORRETOR_REMOVIDO', userId: historicoUserId ?? null },
      })
      return result
    })
  }

  // ─── Dashboard summary ────────────────────────────────────────────────────
  async dashboardSummary(tenantId: string, userId: string, userRole: string) {
    const corretorWhere = userRole === 'CORRETOR' ? { corretorId: userId } : {}
    const baseWhere     = { tenantId, ...corretorWhere }

    const etapas = await this.prisma.pipelineEtapa.findMany({
      where:   { tenantId, ativo: true },
      orderBy: { ordem: 'asc' },
      select:  { id: true, nome: true, cor: true, ordem: true, tipo: true },
    })

    const etapaEncerrada    = etapas.find(e => e.tipo === 'ENCERRADO') ?? etapas.at(-1)
    const etapaFechado      = etapas.find(e => e.tipo === 'FECHADO')   ?? etapas.at(-2)
    const etapasExcluidas   = [etapaFechado?.id, etapaEncerrada?.id].filter(Boolean) as string[]
    const etapasIniciaisIds = etapas
      .filter(e => e.ordem <= 2 && e.id !== etapaEncerrada?.id && e.id !== etapaFechado?.id)
      .map(e => e.id)

    const now           = new Date()
    const inicioMes     = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
    const seteDiasAtras = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

    const MATCH_SELECT = {
      id: true, etapaId: true, leadScore: true, createdAt: true, updatedAt: true,
      etapa:  { select: { id: true, nome: true, cor: true, ordem: true } },
      imovel: { select: { id: true, titulo: true, preco: true, bairro: true, cidade: { select: { nome: true } } } },
      perfil: { select: { id: true, cliente: { select: { id: true, nome: true } } } },
    } as const

    const [contagensBruto, mesFechados, topOportunidades, precisamAtencao] = await Promise.all([
      this.prisma.match.groupBy({ by: ['etapaId'], where: baseWhere, _count: { _all: true } }),
      etapaFechado
        ? this.prisma.match.count({ where: { ...baseWhere, etapaId: etapaFechado.id, updatedAt: { gte: inicioMes } } })
        : Promise.resolve(0),
      etapasIniciaisIds.length > 0
        ? this.prisma.match.findMany({ where: { ...baseWhere, etapaId: { in: etapasIniciaisIds }, leadScore: { gte: 65 } }, select: MATCH_SELECT, orderBy: { leadScore: 'desc' }, take: 3 })
        : Promise.resolve([]),
      this.prisma.match.findMany({ where: { ...baseWhere, etapaId: { notIn: etapasExcluidas }, createdAt: { lt: seteDiasAtras } }, select: MATCH_SELECT, orderBy: { createdAt: 'asc' }, take: 5 }),
    ])

    const porEtapa      = contagensBruto.map(r => ({ etapaId: r.etapaId, count: r._count._all }))
    const emNegociacao  = porEtapa.filter(r => !etapasExcluidas.includes(r.etapaId)).reduce((sum, r) => sum + r.count, 0)

    return { etapas, porEtapa, emNegociacao, mesFechados, topOportunidades, precisamAtencao }
  }

  // ─── Histórico de movimentação de um match ────────────────────────────────
  async listarHistorico(tenantId: string, matchId: string) {
    const match = await this.prisma.match.findFirst({ where: { id: matchId, tenantId } })
    if (!match) throw new NotFoundException('Match não encontrado')

    return this.prisma.matchHistorico.findMany({
      where:   { matchId },
      include: {
        etapaOrigem:  { select: { id: true, nome: true, cor: true } },
        etapaDestino: { select: { id: true, nome: true, cor: true } },
        usuario:      { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'asc' },
    })
  }

  // ─── Delegação para RelatorioService (mantém API do controller) ───────────
  relatorioCorretores(tenantId: string, periodo: string) {
    return this.relatorio.relatorioCorretores(tenantId, periodo)
  }
}
