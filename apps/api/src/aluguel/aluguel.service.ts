import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { FecharAluguelDto } from './dto/fechar-aluguel.dto'

@Injectable()
export class AluguelService {
  constructor(private prisma: PrismaService) {}

  async dadosFechamento(tenantId: string, matchId: string) {
    const [match, tenant] = await Promise.all([
      this.prisma.match.findFirst({
        where: { id: matchId, tenantId },
        include: {
          imovel:   { select: { id: true, titulo: true, preco: true, finalidade: true } },
          corretor: { select: { id: true, name: true } },
        },
      }),
      this.prisma.tenant.findUnique({
        where: { id: tenantId },
        select: {
          aluguelComissaoTipo:     true,
          aluguelPercTaxaUnica:    true,
          aluguelSplitImobiliaria: true,
          aluguelSplitCorretor:    true,
        },
      }),
    ])

    if (!match) throw new NotFoundException('Match não encontrado')
    if (match.imovel.finalidade !== 'ALUGUEL') {
      throw new BadRequestException('Este match não é de aluguel')
    }

    const valorMensal       = Number(match.imovel.preco)
    const percTaxaUnica     = Number(tenant?.aluguelPercTaxaUnica ?? 100)
    const splitImob         = Number(tenant?.aluguelSplitImobiliaria ?? 50)
    const splitCorr         = Number(tenant?.aluguelSplitCorretor ?? 50)
    const valorTaxaBruta    = valorMensal * (percTaxaUnica / 100)
    const valorTaxaImob     = valorTaxaBruta * (splitImob / 100)
    const valorTaxaCorr     = valorTaxaBruta * (splitCorr / 100)

    return {
      matchId:          match.id,
      imovelId:         match.imovelId,
      imovelTitulo:     match.imovel.titulo,
      corretorId:       match.corretorId,
      corretorNome:     match.corretor?.name ?? null,
      valorMensalSugerido: valorMensal,
      comissaoTipo:     tenant?.aluguelComissaoTipo ?? 'TAXA_UNICA',
      percTaxaUnica,
      splitImobiliaria: splitImob,
      splitCorretor:    splitCorr,
      valorTaxaUnicaImob: valorTaxaImob,
      valorTaxaUnicaCorr: valorTaxaCorr,
    }
  }

  async fecharAluguel(tenantId: string, userId: string, dto: FecharAluguelDto) {
    const match = await this.prisma.match.findFirst({
      where: { id: dto.matchId, tenantId },
      include: { imovel: { select: { id: true, finalidade: true } } },
    })
    if (!match) throw new NotFoundException('Match não encontrado')
    if (match.imovel.finalidade !== 'ALUGUEL') {
      throw new BadRequestException('Este match não é de aluguel')
    }

    const dataInicio     = new Date(dto.dataInicio)
    const dataVencimento = new Date(dataInicio)
    dataVencimento.setMonth(dataVencimento.getMonth() + dto.duracaoMeses)

    await this.prisma.$transaction(async (tx) => {
      // Valida que a etapa pertence ao mesmo tenant
      const etapa = await tx.pipelineEtapa.findFirst({ where: { id: dto.etapaId, tenantId } })
      if (!etapa) throw new BadRequestException('Etapa inválida para este tenant')

      // 1. Move etapa
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

      // 3. Muda status do imóvel para ALUGADO
      await tx.imovel.update({
        where: { id: match.imovelId },
        data:  { status: 'ALUGADO' },
      })

      // 4. Cria contrato (upsert — idempotente)
      await tx.contratoAluguel.upsert({
        where:  { matchId: dto.matchId },
        create: {
          tenantId,
          matchId:      dto.matchId,
          imovelId:     match.imovelId,
          corretorId:   match.corretorId ?? null,
          dataInicio,
          duracaoMeses: dto.duracaoMeses,
          dataVencimento,
          valorMensal:  dto.valorMensal,
          percTaxaUnica:      dto.percTaxaUnica     ?? null,
          valorTaxaUnicaImob: dto.valorTaxaUnicaImob ?? null,
          valorTaxaUnicaCorr: dto.valorTaxaUnicaCorr ?? null,
        },
        update: {
          dataInicio,
          duracaoMeses:  dto.duracaoMeses,
          dataVencimento,
          valorMensal:   dto.valorMensal,
          percTaxaUnica:      dto.percTaxaUnica     ?? null,
          valorTaxaUnicaImob: dto.valorTaxaUnicaImob ?? null,
          valorTaxaUnicaCorr: dto.valorTaxaUnicaCorr ?? null,
          status: 'ATIVO',
          dataEncerramento: null,
        },
      })
    })

    return { ok: true }
  }

  async listarContratos(tenantId: string, params: { status?: string; corretorId?: string }) {
    const where: any = { tenantId }
    if (params.status)     where.status     = params.status
    if (params.corretorId) where.corretorId = params.corretorId

    return this.prisma.contratoAluguel.findMany({
      where,
      include: {
        imovel:   { select: { id: true, titulo: true, bairro: true, cidade: { select: { nome: true } } } },
        corretor: { select: { id: true, name: true } },
        match:    { select: { id: true, perfil: { select: { cliente: { select: { nome: true } } } } } },
      },
      orderBy: { createdAt: 'desc' },
    })
  }

  async encerrarContrato(tenantId: string, id: string) {
    const contrato = await this.prisma.contratoAluguel.findFirst({ where: { id, tenantId } })
    if (!contrato) throw new NotFoundException('Contrato não encontrado')
    if (contrato.status === 'ENCERRADO') throw new BadRequestException('Contrato já encerrado')

    await this.prisma.$transaction([
      this.prisma.contratoAluguel.update({
        where: { id },
        data:  { status: 'ENCERRADO', dataEncerramento: new Date() },
      }),
      this.prisma.imovel.update({
        where: { id: contrato.imovelId },
        data:  { status: 'DISPONIVEL' },
      }),
    ])

    return { ok: true }
  }

  async pagarTaxa(tenantId: string, id: string) {
    const contrato = await this.prisma.contratoAluguel.findFirst({ where: { id, tenantId } })
    if (!contrato) throw new NotFoundException('Contrato não encontrado')

    return this.prisma.contratoAluguel.update({
      where: { id },
      data:  { statusTaxaUnica: 'PAGO', dataPagamentoTaxa: new Date() },
    })
  }
}
