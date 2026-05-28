import { Injectable, Logger, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { NotificacoesService } from '../notificacoes/notificacoes.service'
import { PipelineService } from '../pipeline/pipeline.service'

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
      include: { tipos: true },
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
      include: { tipos: true },
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

    // Usa sempre a primeira etapa do pipeline do tenant
    const primeiraEtapa = await this.pipelineService.primeiraEtapa(tenantId)

    await this.prisma.match.create({
      data: {
        perfilId: perfil.id,
        imovelId: imovel.id,
        tenantId,
        etapaId: primeiraEtapa.id,
      },
    })

    await this.notificacoesService.enviarNotificacaoMatch(perfil, imovel)
    this.logger.log(`Match: perfil ${perfil.id} ↔ imóvel ${imovel.id} [etapa: ${primeiraEtapa.nome}]`)
    return true
  }

  // ─────────────────────────────────────────
  // Listagem de matches com etapa incluída
  // ─────────────────────────────────────────
  async listarMatches(tenantId: string, filters?: { imovelId?: string; perfilId?: string }) {
    return this.prisma.match.findMany({
      where: { tenantId, ...filters },
      include: {
        imovel: { include: { tipo: true, cidade: true } },
        perfil: { include: { tipos: true } },
        etapa:  true,
      },
      orderBy: { createdAt: 'desc' },
    })
  }

  // ─────────────────────────────────────────
  // Mover match para outra etapa do pipeline
  // ─────────────────────────────────────────
  async moverEtapa(tenantId: string, matchId: string, etapaId: string) {
    const match = await this.prisma.match.findFirst({ where: { id: matchId, tenantId } })
    if (!match) throw new NotFoundException('Match não encontrado')

    const etapa = await this.prisma.pipelineEtapa.findFirst({ where: { id: etapaId, tenantId, ativo: true } })
    if (!etapa) throw new NotFoundException('Etapa não encontrada')

    return this.prisma.match.update({
      where: { id: matchId },
      data: { etapaId },
      include: { etapa: true },
    })
  }
}
