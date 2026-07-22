import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class RelatorioService {
  constructor(private prisma: PrismaService) {}

  async relatorioCorretores(tenantId: string, periodo: string) {
    const { gte, lte } = this.periodoToRange(periodo)

    const [etapas, corretores, visitasPeriodo] = await Promise.all([
      this.prisma.pipelineEtapa.findMany({
        where: { tenantId, ativo: true },
        orderBy: { ordem: 'asc' },
        select: { id: true, nome: true, cor: true, ordem: true },
      }),
      this.prisma.user.findMany({
        where: { tenantId, role: 'CORRETOR', ativo: true },
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      }),
      this.prisma.visita.findMany({
        where: { tenantId, createdAt: { gte, lte }, corretorId: { not: null } },
        select: { id: true, corretorId: true },
      }),
    ])

    const etapaFechado   = etapas.at(-2)
    const etapaEncerrada = etapas.at(-1)
    const etapasFinais   = [etapaFechado?.id, etapaEncerrada?.id].filter(Boolean) as string[]

    const conversoes = etapaFechado
      ? await this.prisma.matchHistorico.findMany({
          where: {
            tenantId,
            tipo:           'ETAPA_ALTERADA',
            etapaDestinoId: etapaFechado.id,
            createdAt:      { gte, lte },
          },
          select: { matchId: true, match: { select: { corretorId: true } } },
        })
      : []

    const convMatchIds   = conversoes.map(c => c.matchId)
    const matchesPeriodo = await this.prisma.match.findMany({
      where: {
        tenantId,
        OR: [
          { createdAt: { gte, lte } },
          ...(convMatchIds.length ? [{ id: { in: convMatchIds } }] : []),
        ],
      },
      select: { id: true, corretorId: true, etapaId: true, createdAt: true, updatedAt: true },
    })

    const matchIds       = matchesPeriodo.map(m => m.id)
    const matchCreatedAt = new Map(matchesPeriodo.map(m => [m.id, m.createdAt]))

    const historico = matchIds.length
      ? await this.prisma.matchHistorico.findMany({
          where:   { matchId: { in: matchIds }, tipo: 'ETAPA_ALTERADA' },
          select:  { matchId: true, etapaOrigemId: true, etapaDestinoId: true, createdAt: true },
          orderBy: [{ matchId: 'asc' }, { createdAt: 'asc' }],
        })
      : []

    const deltasPorEtapa: Record<string, number[]> = {}
    const byMatch = new Map<string, typeof historico>()
    for (const h of historico) {
      if (!byMatch.has(h.matchId)) byMatch.set(h.matchId, [])
      byMatch.get(h.matchId)!.push(h)
    }

    for (const [matchId, eventos] of byMatch) {
      const criacao = matchCreatedAt.get(matchId)
      if (!criacao) continue

      const primeiro = eventos[0]
      if (primeiro?.etapaOrigemId) {
        const dias = (primeiro.createdAt.getTime() - criacao.getTime()) / (1000 * 60 * 60 * 24)
        if (!deltasPorEtapa[primeiro.etapaOrigemId]) deltasPorEtapa[primeiro.etapaOrigemId] = []
        deltasPorEtapa[primeiro.etapaOrigemId].push(dias)
      }

      for (let i = 0; i < eventos.length - 1; i++) {
        const etapa = eventos[i].etapaDestinoId
        if (!etapa) continue
        const dias = (eventos[i + 1].createdAt.getTime() - eventos[i].createdAt.getTime()) / (1000 * 60 * 60 * 24)
        if (!deltasPorEtapa[etapa]) deltasPorEtapa[etapa] = []
        deltasPorEtapa[etapa].push(dias)
      }
    }

    const tempoMedioPorEtapa = etapas
      .filter(e => e.id !== etapaEncerrada?.id)
      .map(e => {
        const deltas = deltasPorEtapa[e.id]
        if (!deltas?.length) return { etapaId: e.id, etapaNome: e.nome, cor: e.cor, diasMedio: null }
        const media = deltas.reduce((a, b) => a + b, 0) / deltas.length
        return { etapaId: e.id, etapaNome: e.nome, cor: e.cor, diasMedio: Math.round(media * 10) / 10 }
      })

    const now = Date.now()
    const corretoresStats = corretores
      .map(c => {
        const cMatches    = matchesPeriodo.filter(m => m.corretorId === c.id)
        const cConversoes = conversoes.filter(cv => cv.match.corretorId === c.id)
        const cVisitas    = visitasPeriodo.filter(v => v.corretorId === c.id)

        const tempos = cMatches.map(m => {
          const end = etapasFinais.includes(m.etapaId) ? m.updatedAt.getTime() : now
          return (end - m.createdAt.getTime()) / (1000 * 60 * 60 * 24)
        })
        const tempoMedio = tempos.length
          ? Math.round(tempos.reduce((a, b) => a + b, 0) / tempos.length)
          : 0

        return {
          id:            c.id,
          name:          c.name,
          matches:       cMatches.length,
          conversoes:    cConversoes.length,
          taxaConversao: cMatches.length ? Math.round(cConversoes.length / cMatches.length * 100) : 0,
          tempoMedio,
          visitas:       cVisitas.length,
        }
      })
      .filter(c => c.matches > 0 || c.visitas > 0)
      .sort((a, b) => b.conversoes - a.conversoes || b.matches - a.matches)

    const totalMatches    = corretoresStats.reduce((s, c) => s + c.matches, 0)
    const totalConversoes = corretoresStats.reduce((s, c) => s + c.conversoes, 0)
    const tempoMedioGeral = totalMatches
      ? Math.round(corretoresStats.reduce((s, c) => s + c.tempoMedio * c.matches, 0) / totalMatches)
      : 0

    return {
      periodo,
      kpis: {
        totalMatches,
        totalConversoes,
        taxaConversao:    totalMatches ? Math.round(totalConversoes / totalMatches * 100) : 0,
        tempoMedioGeral,
        corretoresAtivos: corretoresStats.length,
      },
      corretores:         corretoresStats,
      tempoMedioPorEtapa,
    }
  }

  periodoToRange(periodo: string): { gte: Date; lte: Date } {
    const now = new Date()
    const lte = new Date(now)
    let   gte: Date

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
