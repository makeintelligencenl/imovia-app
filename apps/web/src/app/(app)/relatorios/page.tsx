'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { BarChart2, TrendingUp, GitMerge, Users, Clock, CalendarDays } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { api } from '@/lib/api'
import { getCurrentUser } from '@/lib/auth'

// ── Types ──────────────────────────────────────────────────────────────────────

type Periodo = 'mes_atual' | 'mes_anterior' | '7dias' | '15dias'

interface CorretorStat {
  id:            string
  name:          string
  matches:       number
  conversoes:    number
  taxaConversao: number
  tempoMedio:    number
  visitas:       number
}

interface TempoEtapa {
  etapaId:   string
  etapaNome: string
  cor:       string
  diasMedio: number | null
}

interface Kpis {
  totalMatches:    number
  totalConversoes: number
  taxaConversao:   number
  tempoMedioGeral: number
  corretoresAtivos: number
}

interface Relatorio {
  periodo:            string
  kpis:               Kpis
  corretores:         CorretorStat[]
  tempoMedioPorEtapa: TempoEtapa[]
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const PERIODO_LABELS: Record<Periodo, string> = {
  '7dias':        'Últimos 7 dias',
  '15dias':       'Últimos 15 dias',
  'mes_atual':    'Este mês',
  'mes_anterior': 'Mês anterior',
}

const AVATAR_COLORS = [
  { bg: '#E6F1FB', text: '#0C447C' },
  { bg: '#E1F5EE', text: '#085041' },
  { bg: '#EEEDFE', text: '#3C3489' },
  { bg: '#FAEEDA', text: '#633806' },
  { bg: '#FAECE7', text: '#712B13' },
]

function initials(name: string) {
  return name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('')
}

function taxaBadge(taxa: number) {
  if (taxa >= 15) return 'bg-emerald-50 text-emerald-800'
  if (taxa >= 8)  return 'bg-amber-50 text-amber-800'
  return 'bg-red-50 text-red-800'
}

const Sk = () => <span className="text-muted-foreground/30 text-2xl font-bold animate-pulse">—</span>

// ═══════════════════════════════════════════════════════════════════════════════
// PAGE
// ═══════════════════════════════════════════════════════════════════════════════

export default function RelatoriosPage() {
  const router  = useRouter()
  const [periodo,   setPeriodo]   = useState<Periodo>('mes_atual')
  const [relatorio, setRelatorio] = useState<Relatorio | null>(null)
  const [loading,   setLoading]   = useState(true)

  useEffect(() => {
    const user = getCurrentUser()
    if (user?.role !== 'ADMIN') { router.replace('/dashboard'); return }
  }, [router])

  useEffect(() => {
    setLoading(true)
    api.get<Relatorio>(`/matches/relatorio-corretores?periodo=${periodo}`)
      .then(setRelatorio)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [periodo])

  const kpis      = relatorio?.kpis
  const corretores = relatorio?.corretores ?? []
  const etapas    = relatorio?.tempoMedioPorEtapa ?? []
  const maxMatches = Math.max(...corretores.map(c => c.matches), 1)
  const maxConv    = Math.max(...corretores.map(c => c.conversoes), 1)
  const maxDias    = Math.max(...etapas.map(e => e.diasMedio ?? 0), 1)

  return (
    <div className="space-y-6">

      {/* ── Cabeçalho ── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Relatórios</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Desempenho individual por corretor</p>
        </div>

        {/* Tabs de período */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
          {(Object.keys(PERIODO_LABELS) as Periodo[]).map(p => (
            <button
              key={p}
              onClick={() => setPeriodo(p)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                periodo === p
                  ? 'bg-white text-slate-800 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {PERIODO_LABELS[p]}
            </button>
          ))}
        </div>
      </div>

      {/* ── KPIs ── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: 'Total de matches',     value: kpis?.totalMatches,    icon: GitMerge,    color: 'text-blue-600',    bg: 'bg-blue-50'    },
          { label: 'Conversões',           value: kpis?.totalConversoes, icon: TrendingUp,  color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Taxa de conversão',    value: kpis ? `${kpis.taxaConversao}%` : undefined, icon: BarChart2, color: 'text-violet-600', bg: 'bg-violet-50' },
          { label: 'Tempo médio pipeline', value: kpis ? `${kpis.tempoMedioGeral}d` : undefined, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Corretores ativos',    value: kpis?.corretoresAtivos, icon: Users,      color: 'text-slate-600',   bg: 'bg-slate-100'  },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <Card key={label} className="rounded-xl shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
                  <p className="text-2xl font-bold mt-2 tabular-nums">
                    {loading ? <Sk /> : (value ?? '—')}
                  </p>
                </div>
                <div className={`p-2.5 rounded-xl ${bg} shrink-0`}>
                  <Icon className={`h-5 w-5 ${color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Tabela de corretores ── */}
      <Card className="rounded-xl shadow-sm overflow-hidden">
        <CardHeader className="pb-3 flex flex-row items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <CardTitle className="text-sm font-semibold">Ranking individual</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-t border-b border-border bg-slate-50/50">
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide w-[28%]">Corretor</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide w-[20%]">Matches</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide w-[20%]">Conversões</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide w-[12%]">Taxa</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide w-[12%]">Tempo médio</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide w-[8%]">Visitas</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-sm text-muted-foreground">
                    Carregando...
                  </td>
                </tr>
              ) : corretores.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-14 text-center">
                    <Users className="h-8 w-8 mx-auto mb-2 text-muted-foreground/20" />
                    <p className="text-sm text-muted-foreground">Nenhum corretor com atividade neste período.</p>
                  </td>
                </tr>
              ) : corretores.map((c, i) => {
                const av = AVATAR_COLORS[i % AVATAR_COLORS.length]
                return (
                  <tr key={c.id} className="border-b border-border last:border-b-0 hover:bg-slate-50/50 transition-colors">
                    {/* Nome */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold shrink-0"
                          style={{ background: av.bg, color: av.text }}
                        >
                          {initials(c.name)}
                        </div>
                        <span className="font-medium text-slate-800">{c.name}</span>
                      </div>
                    </td>
                    {/* Matches — barra */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full bg-blue-500 transition-all"
                            style={{ width: `${Math.round(c.matches / maxMatches * 100)}%` }}
                          />
                        </div>
                        <span className="text-xs font-semibold text-slate-700 tabular-nums w-6 text-right">{c.matches}</span>
                      </div>
                    </td>
                    {/* Conversões — barra */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full bg-emerald-500 transition-all"
                            style={{ width: `${Math.round(c.conversoes / maxConv * 100)}%` }}
                          />
                        </div>
                        <span className="text-xs font-semibold text-slate-700 tabular-nums w-6 text-right">{c.conversoes}</span>
                      </div>
                    </td>
                    {/* Taxa */}
                    <td className="px-4 py-3.5 text-center">
                      <span className={`inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-full ${taxaBadge(c.taxaConversao)}`}>
                        {c.taxaConversao}%
                      </span>
                    </td>
                    {/* Tempo médio */}
                    <td className="px-4 py-3.5 text-center">
                      <span className="text-sm font-semibold tabular-nums text-slate-700">
                        {c.tempoMedio > 0 ? `${c.tempoMedio}d` : '—'}
                      </span>
                    </td>
                    {/* Visitas */}
                    <td className="px-4 py-3.5 text-center">
                      <span className="text-sm tabular-nums text-slate-700">{c.visitas}</span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* ── Gráficos inferiores ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Matches por corretor */}
        <Card className="rounded-xl shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <GitMerge className="h-4 w-4 text-muted-foreground" />
              Matches por corretor
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {loading ? (
              <p className="text-sm text-muted-foreground py-8 text-center">Carregando...</p>
            ) : corretores.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">Sem dados no período.</p>
            ) : (
              <div className="space-y-3">
                {corretores.map((c, i) => {
                  const av = AVATAR_COLORS[i % AVATAR_COLORS.length]
                  return (
                    <div key={c.id} className="flex items-center gap-3">
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-semibold shrink-0"
                        style={{ background: av.bg, color: av.text }}
                      >
                        {initials(c.name)}
                      </div>
                      <span className="text-xs text-muted-foreground w-28 truncate shrink-0">{c.name}</span>
                      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-blue-500 transition-all"
                          style={{ width: `${Math.round(c.matches / maxMatches * 100)}%` }}
                        />
                      </div>
                      <span className="text-xs font-semibold tabular-nums text-slate-700 w-6 text-right">{c.matches}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tempo médio por etapa */}
        <Card className="rounded-xl shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              Tempo médio por etapa (equipe)
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {loading ? (
              <p className="text-sm text-muted-foreground py-8 text-center">Carregando...</p>
            ) : etapas.every(e => e.diasMedio === null) ? (
              <p className="text-sm text-muted-foreground py-8 text-center">Sem movimentações registradas no período.</p>
            ) : (
              <div className="space-y-3">
                {etapas.map(e => (
                  <div key={e.etapaId} className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground w-32 truncate shrink-0">{e.etapaNome}</span>
                    <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                      {e.diasMedio !== null && (
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${Math.round((e.diasMedio / maxDias) * 100)}%`,
                            background: e.cor,
                          }}
                        />
                      )}
                    </div>
                    <span className="text-xs font-semibold tabular-nums text-slate-700 w-12 text-right">
                      {e.diasMedio !== null ? (e.diasMedio < 1 ? '< 1d' : `${e.diasMedio}d`) : '—'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

      </div>

      {/* Rodapé informativo */}
      <p className="text-xs text-muted-foreground text-center pb-2">
        <CalendarDays className="inline h-3 w-3 mr-1 mb-0.5" />
        Matches e visitas contabilizados pela data de criação no período selecionado.
        Conversões contabilizadas pela data de entrada na etapa Fechado.
      </p>

    </div>
  )
}
