import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class FinanceiroService {
  constructor(private prisma: PrismaService) {}

  // ── Configuração de comissão de venda do tenant ─────────────────────────────

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

  // ── Dados pré-preenchidos para modal de fechamento de venda ─────────────────

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

  // ── Fechar venda: move etapa + grava contas a receber ──────────────────────

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
      await tx.match.update({ where: { id: dto.matchId }, data: { etapaId: dto.etapaId } })

      await tx.matchHistorico.create({
        data: { matchId: dto.matchId, tenantId, tipo: 'ETAPA_ALTERADA', userId, etapaDestinoId: dto.etapaId },
      })

      // Idempotente: remove contas a receber anteriores de venda deste match
      await tx.contaReceber.deleteMany({ where: { matchId: dto.matchId, tenantId, categoria: 'VENDA' } })

      if (match.imovel.finalidade === 'VENDA') {
        await tx.contaReceber.createMany({
          data: [
            {
              tenantId,
              matchId:    dto.matchId,
              imovelId:   match.imovelId,
              corretorId: match.corretorId ?? null,
              categoria:  'VENDA',
              tipo:       'IMOBILIARIA',
              valorBase:  dto.valorImovel,
              percentual: dto.percImobiliaria,
              valor:      dto.valorImobiliaria,
            },
            {
              tenantId,
              matchId:    dto.matchId,
              imovelId:   match.imovelId,
              corretorId: match.corretorId ?? null,
              categoria:  'VENDA',
              tipo:       'CORRETOR',
              valorBase:  dto.valorImovel,
              percentual: dto.percCorretor,
              valor:      dto.valorCorretor,
            },
          ],
        })
      }
    })

    return { ok: true }
  }

  // ── Listagem de contas a receber ────────────────────────────────────────────

  async listar(tenantId: string, params: {
    categoria?:  string
    tipo?:       string
    status?:     string
    corretorId?: string
    periodo?:    string
  }, requester?: { id: string; role: string }) {
    const where: any = { tenantId }
    if (params.status)    where.status    = params.status
    if (params.categoria) where.categoria = params.categoria

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

    return this.prisma.contaReceber.findMany({
      where,
      include: {
        match:    { select: { id: true, perfil: { select: { cliente: { select: { nome: true } } } } } },
        imovel:   { select: { id: true, titulo: true, cidade: { select: { nome: true } } } },
        corretor: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    })
  }

  // ── Marcar como pago ────────────────────────────────────────────────────────

  async marcarPago(tenantId: string, id: string) {
    const conta = await this.prisma.contaReceber.findFirst({ where: { id, tenantId } })
    if (!conta) throw new NotFoundException('Conta a receber não encontrada')

    return this.prisma.contaReceber.update({
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
      this.prisma.contaReceber.aggregate({
        where: { ...where, tipo: 'IMOBILIARIA' },
        _sum: { valor: true },
        _count: true,
      }),
      this.prisma.contaReceber.aggregate({
        where: { ...where, tipo: 'CORRETOR' },
        _sum: { valor: true },
        _count: true,
      }),
      this.prisma.contaReceber.aggregate({
        where: { ...where, status: 'PENDENTE' },
        _sum: { valor: true },
      }),
      this.prisma.contaReceber.aggregate({
        where: { ...where, status: 'PAGO' },
        _sum: { valor: true },
      }),
    ])

    return {
      totalImobiliaria: Number(totalImob._sum.valor    ?? 0),
      totalCorretor:    Number(totalCorretor._sum.valor ?? 0),
      totalGeral:       Number(totalImob._sum.valor ?? 0) + Number(totalCorretor._sum.valor ?? 0),
      pendente:         Number(pendentes._sum.valor  ?? 0),
      pago:             Number(pagas._sum.valor      ?? 0),
      vendas:           totalImob._count,
    }
  }

  // ── Configuração de comissão de aluguel do tenant ──────────────────────────

  async getConfigAluguel(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        aluguelComissaoTipo:     true,
        aluguelPercTaxaUnica:    true,
        aluguelSplitImobiliaria: true,
        aluguelSplitCorretor:    true,
      },
    })
    if (!tenant) throw new NotFoundException('Tenant não encontrado')
    return {
      comissaoTipo:     tenant.aluguelComissaoTipo,
      percTaxaUnica:    Number(tenant.aluguelPercTaxaUnica    ?? 100),
      splitImobiliaria: Number(tenant.aluguelSplitImobiliaria ?? 50),
      splitCorretor:    Number(tenant.aluguelSplitCorretor    ?? 50),
    }
  }

  async updateConfigAluguel(tenantId: string, dto: {
    comissaoTipo:     string
    percTaxaUnica:    number
    splitImobiliaria: number
    splitCorretor:    number
  }) {
    return this.prisma.tenant.update({
      where: { id: tenantId },
      data: {
        aluguelComissaoTipo:     dto.comissaoTipo as any,
        aluguelPercTaxaUnica:    dto.percTaxaUnica,
        aluguelSplitImobiliaria: dto.splitImobiliaria,
        aluguelSplitCorretor:    dto.splitCorretor,
      },
      select: {
        aluguelComissaoTipo:     true,
        aluguelPercTaxaUnica:    true,
        aluguelSplitImobiliaria: true,
        aluguelSplitCorretor:    true,
      },
    })
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
