import { Injectable, Logger, NotFoundException } from '@nestjs/common'
import { StatusMatch } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'
import { NotificacoesService } from '../notificacoes/notificacoes.service'

@Injectable()
export class MatchingService {
  private readonly logger = new Logger(MatchingService.name)

  constructor(
    private prisma: PrismaService,
    private notificacoesService: NotificacoesService,
  ) {}

  // ─────────────────────────────────────────
  // Disparado quando um IMÓVEL é cadastrado
  // Busca todos os perfis compatíveis
  // ─────────────────────────────────────────
  async executarMatching(tenantId: string, imovelId: string) {
    const imovel = await this.prisma.imovel.findFirst({
      where: { id: imovelId, tenantId, status: 'DISPONIVEL' },
    })
    if (!imovel) return { matchesEncontrados: 0 }

    const perfisCompativeis = await this.prisma.perfilBusca.findMany({
      where: {
        tenantId,
        ativo: true,
        finalidade: imovel.finalidade,
        // Compara por ID — sem risco de case mismatch
        tipos: { some: { id: imovel.tipoId } },
        precoMin: { lte: imovel.preco },
        precoMax: { gte: imovel.preco },
        areaMin: { lte: imovel.areaM2 },
        cidades: { hasSome: [imovel.cidade] },
        AND: [
          // quartosMin null = sem preferência de quartos
          ...(imovel.quartos
            ? [{ OR: [{ quartosMin: null }, { quartosMin: { lte: imovel.quartos } }] }]
            : []),
          // Bairro: sem preferência (null ou vazio) ou bairro preferido inclui o do imóvel
          {
            OR: [
              { bairros: { equals: null } },   // seed antigo gravou NULL
              { bairros: { isEmpty: true } },  // cadastro novo grava {}
              { bairros: { hasSome: [imovel.bairro] } },
            ],
          },
        ],
      },
      include: { tipos: true },
    })

    let matchesEncontrados = 0
    for (const perfil of perfisCompativeis) {
      const gerado = await this.gerarMatch(perfil, imovel, tenantId)
      if (gerado) matchesEncontrados++
    }

    this.logger.log(`[Imóvel ${imovelId}] ${matchesEncontrados} matches gerados`)
    return { matchesEncontrados }
  }

  // ─────────────────────────────────────────
  // Disparado quando um PERFIL é cadastrado
  // Busca todos os imóveis disponíveis compatíveis
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
        // Compara por ID — sem risco de case mismatch
        tipoId: { in: tipoIds },
        preco: {
          gte: perfil.precoMin,
          lte: perfil.precoMax,
        },
        areaM2: { gte: perfil.areaMin },
        ...(perfil.quartosMin ? { quartos: { gte: perfil.quartosMin } } : {}),
        cidade: { in: perfil.cidades },
        ...((perfil.bairros as string[]).length > 0
          ? { bairro: { in: perfil.bairros as string[] } }
          : {}),
      },
    })

    let matchesEncontrados = 0
    for (const imovel of imoveisCompativeis) {
      const gerado = await this.gerarMatch(perfil, imovel, tenantId)
      if (gerado) matchesEncontrados++
    }

    this.logger.log(`[Perfil ${perfilId}] ${matchesEncontrados} matches gerados`)
    return { matchesEncontrados }
  }

  // ─────────────────────────────────────────
  // Cria o match e envia notificação
  // (evita duplicatas automaticamente)
  // ─────────────────────────────────────────
  private async gerarMatch(perfil: any, imovel: any, tenantId: string): Promise<boolean> {
    const jaExiste = await this.prisma.match.findUnique({
      where: { perfilId_imovelId: { perfilId: perfil.id, imovelId: imovel.id } },
    })
    if (jaExiste) return false

    await this.prisma.match.create({
      data: { perfilId: perfil.id, imovelId: imovel.id, tenantId, status: 'NOTIFICADO' },
    })

    await this.notificacoesService.enviarNotificacaoMatch(perfil, imovel)

    this.logger.log(`Match: perfil ${perfil.id} ↔ imóvel ${imovel.id}`)
    return true
  }

  // ─────────────────────────────────────────
  // Listagem e atualização de matches
  // ─────────────────────────────────────────
  async listarMatches(tenantId: string, filters?: { imovelId?: string; perfilId?: string }) {
    return this.prisma.match.findMany({
      where: { tenantId, ...filters },
      include: {
        imovel: { include: { tipo: true } },
        perfil: { include: { tipos: true } },
      },
      orderBy: { createdAt: 'desc' },
    })
  }

  async atualizarStatusMatch(tenantId: string, matchId: string, status: string) {
    const match = await this.prisma.match.findFirst({ where: { id: matchId, tenantId } })
    if (!match) throw new NotFoundException('Match não encontrado')
    return this.prisma.match.update({
      where: { id: matchId },
      data: { status: status as StatusMatch },
    })
  }
}
