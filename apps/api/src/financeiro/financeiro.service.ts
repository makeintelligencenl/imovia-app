import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class FinanceiroService {
  constructor(private prisma: PrismaService) {}

  // ── Configuração de comissão do tenant ──────────────────────────────────────

  async getConfig(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        comissaoPercentualTotal:  true,
        comissaoSplitImobiliaria: true,
        comissaoSplitCorretor:    true,
      },
    })
    if (!tenant) throw new NotFoundException('Tenant não encontrado')
    return {
      percentualTotal:  Number(tenant.comissaoPercentualTotal  ?? 6),
      splitImobiliaria: Number(tenant.comissaoSplitImobiliaria ?? 50),
      splitCorretor:    Number(tenant.comissaoSplitCorretor    ?? 50),
    }
  }

  async updateConfig(tenantId: string, dto: {
    percentualTotal:  number
    splitImobiliaria: number
    splitCorretor:    number
  }) {
    return this.prisma.tenant.update({
      where: { id: tenantId },
      data: {
        comissaoPercentualTotal:  dto.percentualTotal,
        comissaoSplitImobiliaria: dto.splitImobiliaria,
        comissaoSplitCorretor:    dto.splitCorretor,
      },
      select: {
        comissaoPercentualTotal:  true,
        comissaoSplitImobiliaria: true,
        comissaoSplitCorretor:    true,
      },
    })
  }

  // ── Criação automática de comissões ao fechar uma venda ─────────────────────
  // Chamado por MatchingService.moverEtapa quando a etapa destino é "Fechado"
  // e o imóvel tem finalidade VENDA.

  // Retorna dados do match + config do tenant para pré-preencher o modal de fechamento
  async dadosFechamento(tenantId: string, matchId: string) {
    const [match, config] = await Promise.all([
      this.prisma.match.findFirst({
        where: { id: matchId, tenantId },
        include: {
          imovel:   { select: { id: true, titulo: true, preco: true, finalidade: true } },
          corretor: { select: { id: true, name: true } },
        },
      }),
      this.getConfig(tenantId),
    ])
    if (!match) throw new NotFoundException('Match não encontrado')

    const valorImovel   = Number(match.imovel.preco)
    const percImob      = config.percentualTotal * (config.splitImobiliaria / 100)
    const percCorretor  = config.percentualTotal * (config.splitCorretor    / 100)

    return {
      imovelId:        match.imovelId,
      imovelTitulo:    match.imovel.titulo,
      imovelFinalidade: match.imovel.finalidade,
      corretorId:      match.corretorId,
      corretorNome:    match.corretor?.name ?? null,
      valorImovel,
      comissao: {
        percentualTotal:   config.percentualTotal,
        percImobiliaria:   percImob,
        percCorretor:      percCorretor,
        valorImobiliaria:  valorImovel * percImob    / 100,
        valorCorretor:     valorImovel * percCorretor / 100,
      },
    }
  }

  async gerarComissoesVenda(
    tenantId: string,
    matchId:  string,
    valores?: {
      valorImovel:      number
      percImobiliaria:  number
      valorImobiliaria: number
      percCorretor:     number
      valorCorretor:    number
    },
  ) {
    const match = await this.prisma.match.findFirst({
      where: { id: matchId, tenantId },
      include: { imovel: { select: { id: true, preco: true, finalidade: true } } },
    })
    if (!match || match.imovel.finalidade !== 'VENDA') return

    // Idempotente: apaga registros anteriores se valores foram recalculados
    await this.prisma.comissaoVenda.deleteMany({ where: { matchId, tenantId } })

    let valorImovel: number
    let percImob:    number
    let valImob:     number
    let percCorr:    number
    let valCorr:     number

    if (valores) {
      valorImovel = valores.valorImovel
      percImob    = valores.percImobiliaria
      valImob     = valores.valorImobiliaria
      percCorr    = valores.percCorretor
      valCorr     = valores.valorCorretor
    } else {
      const config = await this.getConfig(tenantId)
      valorImovel  = Number(match.imovel.preco)
      percImob     = config.percentualTotal * (config.splitImobiliaria / 100)
      percCorr     = config.percentualTotal * (config.splitCorretor    / 100)
      valImob      = valorImovel * percImob  / 100
      valCorr      = valorImovel * percCorr  / 100
    }

    await this.prisma.$transaction([
      this.prisma.comissaoVenda.create({
        data: {
          tenantId, matchId,
          imovelId:   match.imovelId,
          corretorId: match.corretorId ?? null,
          tipo:       'IMOBILIARIA',
          valorImovel, percentual: percImob, valor: valImob,
        },
      }),
      this.prisma.comissaoVenda.create({
        data: {
          tenantId, matchId,
          imovelId:   match.imovelId,
          corretorId: match.corretorId ?? null,
          tipo:       'CORRETOR',
          valorImovel, percentual: percCorr, valor: valCorr,
        },
      }),
    ])
  }

  // ── Fechar venda: move etapa + grava comissões em uma operação ─────────────

  async fecharVenda(
    tenantId: string,
    userId:   string,
    dto: {
      matchId:          string
      etapaId:          string
      valorImovel:      number
      percImobiliaria:  number
      valorImobiliaria: number
      percCorretor:     number
      valorCorretor:    number
    },
  ) {
    const match = await this.prisma.match.findFirst({
      where: { id: dto.matchId, tenantId },
      select: { id: true, imovelId: true, corretorId: true, imovel: { select: { finalidade: true } } },
    })
    if (!match) throw new NotFoundException('Match não encontrado')

    await this.prisma.$transaction(async (tx) => {
      // 1. Move a etapa
      await tx.match.update({
        where: { id: dto.matchId },
        data:  { etapaId: dto.etapaId },
      })

      // 2. Registra histórico
      await tx.matchHistorico.create({
        data: {
          matchId:        dto.matchId,
          tenantId,
          tipo:           'ETAPA_ALTERADA',
          userId,
          etapaDestinoId: dto.etapaId,
        },
      })

      // 3. Remove comissões anteriores (idempotente) e recria com valores confirmados
      await tx.comissaoVenda.deleteMany({ where: { matchId: dto.matchId, tenantId } })

      if (match.imovel.finalidade === 'VENDA') {
        await tx.comissaoVenda.createMany({
          data: [
            {
              tenantId,
              matchId:    dto.matchId,
              imovelId:   match.imovelId,
              corretorId: match.corretorId ?? null,
              tipo:       'IMOBILIARIA',
              valorImovel: dto.valorImovel,
              percentual:  dto.percImobiliaria,
              valor:       dto.valorImobiliaria,
            },
            {
              tenantId,
              matchId:    dto.matchId,
              imovelId:   match.imovelId,
              corretorId: match.corretorId ?? null,
              tipo:       'CORRETOR',
              valorImovel: dto.valorImovel,
              percentual:  dto.percCorretor,
              valor:       dto.valorCorretor,
            },
          ],
        })
      }
    })

    return { ok: true }
  }

  // ── Listagem de comissões ───────────────────────────────────────────────────

  async listar(tenantId: string, params: {
    tipo?:       string
    status?:     string
    corretorId?: string
    periodo?:    string
  }, requester?: { id: string; role: string }) {
    const where: any = { tenantId }
    if (params.status) where.status = params.status
    // CORRETOR só vê as próprias comissões (tipo CORRETOR com seu corretorId)
    if (requester?.role === 'CORRETOR') {
      where.corretorId = requester.id
      where.tipo = 'CORRETOR'
    } else {
      if (params.tipo)       where.tipo       = params.tipo
      if (params.corretorId) where.corretorId = params.corretorId
    }
    if (params.periodo) {
      const { gte, lte } = this.periodoToRange(params.periodo)
      where.createdAt = { gte, lte }
    }

    return this.prisma.comissaoVenda.findMany({
      where,
      include: {
        match:   { select: { id: true, perfil: { select: { cliente: { select: { nome: true } } } } } },
        imovel:  { select: { id: true, titulo: true, preco: true, cidade: { select: { nome: true } } } },
        corretor: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    })
  }

  // ── Marcar como pago ────────────────────────────────────────────────────────

  async marcarPago(tenantId: string, id: string) {
    const comissao = await this.prisma.comissaoVenda.findFirst({ where: { id, tenantId } })
    if (!comissao) throw new NotFoundException('Comissão não encontrada')

    return this.prisma.comissaoVenda.update({
      where: { id },
      data:  { status: 'PAGO', dataPagamento: new Date() },
    })
  }

  // ── Resumo financeiro ───────────────────────────────────────────────────────

  async resumo(tenantId: string, periodo?: string) {
    const where: any = { tenantId }
    if (periodo) {
      const { gte, lte } = this.periodoToRange(periodo)
      where.createdAt = { gte, lte }
    }

    const [totalImob, totalCorretor, pendentes, pagas] = await Promise.all([
      this.prisma.comissaoVenda.aggregate({
        where: { ...where, tipo: 'IMOBILIARIA' },
        _sum: { valor: true },
        _count: true,
      }),
      this.prisma.comissaoVenda.aggregate({
        where: { ...where, tipo: 'CORRETOR' },
        _sum: { valor: true },
        _count: true,
      }),
      this.prisma.comissaoVenda.aggregate({
        where: { ...where, status: 'PENDENTE' },
        _sum: { valor: true },
      }),
      this.prisma.comissaoVenda.aggregate({
        where: { ...where, status: 'PAGO' },
        _sum: { valor: true },
      }),
    ])

    return {
      totalImobiliaria: Number(totalImob._sum.valor   ?? 0),
      totalCorretor:    Number(totalCorretor._sum.valor ?? 0),
      totalGeral:       Number(totalImob._sum.valor ?? 0) + Number(totalCorretor._sum.valor ?? 0),
      pendente:         Number(pendentes._sum.valor  ?? 0),
      pago:             Number(pagas._sum.valor      ?? 0),
      vendas:           totalImob._count,
    }
  }

  private periodoToRange(periodo: string): { gte: Date; lte: Date } {
    const now = new Date()
    const lte = new Date(now)
    let gte: Date

    if (periodo === '7dias') {
      gte = new Date(now); gte.setDate(gte.getDate() - 7)
    } else if (periodo === '15dias') {
      gte = new Date(now); gte.setDate(gte.getDate() - 15)
    } else if (periodo === 'mes_anterior') {
      gte = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1))
      lte.setTime(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 0, 23, 59, 59)).getTime())
    } else {
      gte = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
    }

    return { gte, lte }
  }
}
