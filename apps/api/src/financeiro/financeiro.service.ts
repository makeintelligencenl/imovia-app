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

  async gerarComissoesVenda(tenantId: string, matchId: string) {
    const match = await this.prisma.match.findFirst({
      where: { id: matchId, tenantId },
      include: {
        imovel: { select: { id: true, preco: true, finalidade: true } },
      },
    })
    if (!match || match.imovel.finalidade !== 'VENDA') return

    // Idempotente: não duplica se já existir
    const existente = await this.prisma.comissaoVenda.findFirst({
      where: { matchId, tipo: 'IMOBILIARIA' },
    })
    if (existente) return

    const config = await this.getConfig(tenantId)
    const valorImovel    = Number(match.imovel.preco)
    const valorTotal     = valorImovel * (config.percentualTotal / 100)
    const valorImob      = valorTotal  * (config.splitImobiliaria / 100)
    const valorCorretor  = valorTotal  * (config.splitCorretor    / 100)
    const percImob       = config.percentualTotal * (config.splitImobiliaria / 100)
    const percCorretor   = config.percentualTotal * (config.splitCorretor    / 100)

    await this.prisma.$transaction([
      this.prisma.comissaoVenda.create({
        data: {
          tenantId,
          matchId,
          imovelId:   match.imovelId,
          corretorId: match.corretorId ?? null,
          tipo:       'IMOBILIARIA',
          valorImovel,
          percentual: percImob,
          valor:      valorImob,
        },
      }),
      this.prisma.comissaoVenda.create({
        data: {
          tenantId,
          matchId,
          imovelId:   match.imovelId,
          corretorId: match.corretorId ?? null,
          tipo:       'CORRETOR',
          valorImovel,
          percentual: percCorretor,
          valor:      valorCorretor,
        },
      }),
    ])
  }

  // ── Listagem de comissões ───────────────────────────────────────────────────

  async listar(tenantId: string, params: {
    tipo?:       string
    status?:     string
    corretorId?: string
    periodo?:    string
  }) {
    const where: any = { tenantId }
    if (params.tipo)       where.tipo       = params.tipo
    if (params.status)     where.status     = params.status
    if (params.corretorId) where.corretorId = params.corretorId
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
