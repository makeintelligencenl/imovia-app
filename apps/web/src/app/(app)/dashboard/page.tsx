'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Home, Users, GitMerge, TrendingUp, ArrowRight, Layers,
  AlertCircle, DollarSign, KeyRound, Trophy,
} from 'lucide-react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { api } from '@/lib/api'
import { formatCurrency } from '@/lib/utils'
import { getCurrentUser } from '@/lib/auth'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip as ReTooltip,
  ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, Legend, Label,
} from 'recharts'
import type { TooltipProps } from 'recharts'
import type { ValueType, NameType } from 'recharts/types/component/DefaultTooltipContent'

// ── Design system ──────────────────────────────────────────────────────────────
const STATUS_COLORS: Record<string, string> = {
  DISPONIVEL: '#16A34A',
  RESERVADO:  '#D97706',
  VENDIDO:    '#2563EB',
  ALUGADO:    '#7C3AED',
}
const STATUS_LABELS: Record<string, string> = {
  DISPONIVEL: 'Disponível',
  RESERVADO:  'Reservado',
  VENDIDO:    'Vendido',
  ALUGADO:    'Alugado',
}

const DIAS   = ['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado']
const MESES  = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

// ── Custom Tooltip ─────────────────────────────────────────────────────────────
function CustomTooltip({ active, payload, label }: TooltipProps<ValueType, NameType>) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-border bg-white px-3 py-2 shadow-md text-sm">
      {label && <p className="mb-1 font-medium text-foreground">{label}</p>}
      {payload.map((entry, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: entry.color as string }} />
          <span className="text-muted-foreground">{entry.name}:</span>
          <span className="font-medium text-foreground">{entry.value}</span>
        </div>
      ))}
    </div>
  )
}

// ── Tipos ─────────────────────────────────────────────────────────────────────
interface PipelineEtapa { id: string; nome: string; cor: string; ordem: number }
interface Imovel {
  id: string; titulo: string; preco: number; bairro: string
  finalidade: string; status: string
  tipo: { nome: string }
  cidade: { nome: string }
}
interface Perfil { id: string; createdAt: string; cliente: { nome: string } }
interface Match {
  id: string; etapaId: string; etapa: PipelineEtapa; createdAt: string; corretorId: string | null
  imovel: { id: string; titulo: string; preco: number; cidade: { nome: string } }
  perfil: { cliente: { nome: string } }
}
interface Corretor { id: string; name: string; role: string }
interface Resumo { totalImobiliaria: number; totalCorretor: number; totalGeral: number; pendente: number; pago: number; vendas: number }
interface ContratoAluguel { id: string; status: string }

// ── KPI Tile ──────────────────────────────────────────────────────────────────
function StatTile({ label, value, sub, icon }: {
  label: string; value: React.ReactNode; sub?: React.ReactNode; icon: React.ReactNode
}) {
  return (
    <Card className="rounded-xl shadow-sm">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
            <p className="text-3xl font-bold mt-2 tabular-nums text-foreground">{value}</p>
            {sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
          </div>
          <div className="p-2.5 rounded-xl bg-primary/5 shrink-0 text-primary">{icon}</div>
        </div>
      </CardContent>
    </Card>
  )
}

// ── Funil — taxa de conversão entre etapas ────────────────────────────────────
function FunnelChart({ data }: { data: { name: string; total: number; color: string }[] }) {
  if (!data.length || data.every((d) => d.total === 0)) {
    return <div className="flex items-center justify-center h-52 text-sm text-muted-foreground">Sem matches ainda</div>
  }

  const maxVal = Math.max(...data.map((d) => d.total), 1)
  const etapaFechada = data.length >= 2 ? data[data.length - 2] : data[data.length - 1]
  const taxaFechamento = data[0].total > 0 ? Math.round((etapaFechada.total / data[0].total) * 100) : 0

  const rows = data.map((d, i) => {
    const prev    = i > 0 ? data[i - 1].total : null
    const dropPct = prev ? Math.round(((prev - d.total) / prev) * 100) : null
    const convPct = prev ? Math.round((d.total / prev) * 100) : 100
    const barPct  = Math.round((d.total / maxVal) * 100)
    return { ...d, prev, dropPct, convPct, barPct }
  })

  return (
    <div className="space-y-2">
      {rows.map((r, i) => (
        <div key={i} className="flex items-center gap-3">
          <div className="w-32 shrink-0 text-right">
            <span className="text-xs text-muted-foreground">{r.name}</span>
          </div>
          <div className="flex-1 h-8 bg-[#F0F4FA] rounded-md overflow-hidden relative">
            <div className="h-full rounded-md flex items-center px-3 transition-all"
                 style={{ width: `${Math.max(r.barPct, 4)}%`, backgroundColor: r.color }}>
              {r.barPct >= 12 && <span className="text-xs font-bold text-white">{r.total}</span>}
            </div>
            {r.barPct < 12 && (
              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs font-bold" style={{ color: r.color }}>
                {r.total}
              </span>
            )}
          </div>
          <div className="w-16 shrink-0 text-right">
            {r.dropPct !== null ? (
              <div>
                <span className="text-xs font-semibold" style={{
                  color: r.convPct >= 50 ? '#16A34A' : r.convPct >= 25 ? '#D97706' : '#DC2626'
                }}>{r.convPct}%</span>
                <div className="text-[10px] text-muted-foreground">conv.</div>
              </div>
            ) : (
              <span className="text-xs text-muted-foreground">base</span>
            )}
          </div>
        </div>
      ))}
      <div className="mt-3 pt-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
        <span>{data[0].total} matches totais</span>
        <span>Taxa de fechamento: <span className="font-semibold text-foreground">{taxaFechamento}%</span></span>
      </div>
    </div>
  )
}

// ── Donut de status ────────────────────────────────────────────────────────────
function DonutStatus({ imoveis }: { imoveis: Imovel[] }) {
  const map: Record<string, number> = {}
  imoveis.forEach((i) => { map[i.status] = (map[i.status] ?? 0) + 1 })
  const data = Object.entries(map)
    .map(([status, value]) => ({ name: STATUS_LABELS[status] ?? status, value, color: STATUS_COLORS[status] ?? '#9CA3AF' }))
    .filter((d) => d.value > 0)
  const total = data.reduce((s, d) => s + d.value, 0)

  const centerLabel = ({ viewBox }: any) => {
    const { cx, cy } = viewBox ?? {}
    return (
      <g>
        <text x={cx} y={cy - 6} textAnchor="middle" fontSize={22} fontWeight="700" fill="#1E2D5A">{total}</text>
        <text x={cx} y={cy + 11} textAnchor="middle" fontSize={10} fill="#6B7B8D">imóveis</text>
      </g>
    )
  }

  if (total === 0) return <div className="flex items-center justify-center h-52 text-sm text-muted-foreground">Sem imóveis</div>

  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie data={data} cx="50%" cy="44%" innerRadius="58%" outerRadius="78%"
             dataKey="value" paddingAngle={2} stroke="#F5F8FC" strokeWidth={2} labelLine={false}>
          {data.map((d, i) => <Cell key={i} fill={d.color} />)}
          <Label content={centerLabel} position="center" />
        </Pie>
        <ReTooltip content={<CustomTooltip />} />
        <Legend iconType="circle" iconSize={8} formatter={(value) => {
          const item = data.find((d) => d.name === value)
          const pct  = item ? Math.round((item.value / total) * 100) : 0
          return (
            <span className="text-xs text-muted-foreground">
              {value} <span className="font-semibold text-foreground">{item?.value}</span>
              <span className="text-muted-foreground/70"> ({pct}%)</span>
            </span>
          )
        }} />
      </PieChart>
    </ResponsiveContainer>
  )
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}
function formatVGV(value: number): string {
  if (value >= 1_000_000_000) return `R$ ${(value / 1_000_000_000).toFixed(1)}Bi`
  if (value >= 1_000_000)     return `R$ ${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000)         return `R$ ${(value / 1_000).toFixed(0)}K`
  return formatCurrency(value)
}
function fmtR(n: number) {
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
function buildLeadsPerMonth(perfis: Perfil[]) {
  const now = new Date()
  return Array.from({ length: 6 }, (_, i) => {
    const d     = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1)
    const label = d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '').replace(/^\w/, c => c.toUpperCase())
    const leads = perfis.filter(p => {
      const pd = new Date(p.createdAt)
      return pd.getFullYear() === d.getFullYear() && pd.getMonth() === d.getMonth()
    }).length
    return { mes: label, leads }
  })
}

// ── Página ────────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const router = useRouter()
  const now    = new Date()

  const [userName,    setUserName]    = useState('')
  const [tenantName,  setTenantName]  = useState('')
  const [imoveis,     setImoveis]     = useState<Imovel[]>([])
  const [perfis,      setPerfis]      = useState<Perfil[]>([])
  const [matches,     setMatches]     = useState<Match[]>([])
  const [etapas,      setEtapas]      = useState<PipelineEtapa[]>([])
  const [corretores,  setCorretores]  = useState<Corretor[]>([])
  const [resumo,      setResumo]      = useState<Resumo | null>(null)
  const [contratos,   setContratos]   = useState<ContratoAluguel[]>([])
  const [loading,     setLoading]     = useState(true)
  const [apiError,    setApiError]    = useState(false)

  useEffect(() => {
    const user = getCurrentUser()
    if (user?.role === 'CORRETOR') { router.replace('/corretor'); return }
    setUserName(user?.name?.split(' ')[0] ?? 'Admin')
    setTenantName((user as any)?.tenantName ?? '')
  }, [router])

  useEffect(() => {
    const user = getCurrentUser()
    if (user?.role === 'CORRETOR') return

    const loadAll = async () => {
      setLoading(true); setApiError(false)
      let hasError = false
      const [im, pe, ma, et, us, re, co] = await Promise.allSettled([
        api.get<Imovel[]>('/imoveis'),
        api.get<Perfil[]>('/perfis'),
        api.get<Match[]>('/matches'),
        api.get<PipelineEtapa[]>('/pipeline/etapas'),
        api.get<Corretor[]>('/users'),
        api.get<Resumo>('/financeiro/resumo?periodo=mes_atual'),
        api.get<ContratoAluguel[]>('/aluguel/contratos?status=ATIVO'),
      ])
      if (im.status === 'fulfilled') setImoveis(im.value)
      else { console.error('Erro imóveis:', im.reason); hasError = true }
      if (pe.status === 'fulfilled') setPerfis(pe.value)
      else { console.error('Erro perfis:', pe.reason); hasError = true }
      if (ma.status === 'fulfilled') setMatches(ma.value)
      else { console.error('Erro matches:', ma.reason); hasError = true }
      if (et.status === 'fulfilled') setEtapas(et.value)
      else console.warn('Erro etapas:', et.reason)
      if (us.status === 'fulfilled') setCorretores(us.value.filter(u => u.role === 'CORRETOR'))
      if (re.status === 'fulfilled') setResumo(re.value)
      if (co.status === 'fulfilled') setContratos(co.value)
      if (hasError) setApiError(true)
      setLoading(false)
    }
    loadAll()
  }, [])

  // ── Derivações ────────────────────────────────────────────────────────────
  const cutoff30       = new Date(); cutoff30.setDate(cutoff30.getDate() - 30)
  const novosLeads     = perfis.filter(p => new Date(p.createdAt) >= cutoff30).length
  const etapaEncerrada = etapas.find((e: any) => e.tipo === 'ENCERRADO') ?? (etapas.length >= 1 ? etapas[etapas.length - 1] : null)
  const etapaFechado   = etapas.find((e: any) => e.tipo === 'FECHADO')   ?? (etapas.length >= 2 ? etapas[etapas.length - 2] : null)
  const convertidos    = etapaFechado ? matches.filter(m => m.etapaId === etapaFechado.id).length : 0
  const taxaConv       = matches.length ? Math.round((convertidos / matches.length) * 100) : 0
  const matchesAtivos  = matches.filter(m => m.etapaId !== etapaEncerrada?.id).length
  const vgvAtivo       = (() => {
    const seen = new Set<string>(); let total = 0
    for (const m of matches) {
      if (m.etapaId === etapaEncerrada?.id) continue
      if (!seen.has(m.imovel.id)) { seen.add(m.imovel.id); total += Number(m.imovel.preco) }
    }
    return total
  })()
  const funilData      = etapas.map(e => ({ name: e.nome, total: matches.filter(m => m.etapaId === e.id).length, color: e.cor }))
  const leadsPerMonth  = buildLeadsPerMonth(perfis)
  const idsComMatch    = new Set(matches.map(m => m.imovel.id))
  const imoveisSemMatch = imoveis.filter(i => i.status === 'DISPONIVEL' && !idsComMatch.has(i.id)).slice(0, 6)

  // Ranking de corretores por matches ativos
  const rankingCorretores = corretores.map(c => ({
    ...c,
    total:    matches.filter(m => m.corretorId === c.id).length,
    ativos:   matches.filter(m => m.corretorId === c.id && m.etapaId !== etapaEncerrada?.id).length,
    fechados: etapaFechado ? matches.filter(m => m.corretorId === c.id && m.etapaId === etapaFechado.id).length : 0,
  })).sort((a, b) => b.ativos - a.ativos)

  const Skeleton = () => <span className="text-muted-foreground/30">—</span>

  return (
    <div className="space-y-6">

      {/* ── Header de saudação ─────────────────────────────────────────────── */}
      <div className="rounded-2xl px-6 py-5 shadow-sm text-white"
           style={{ background: 'linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)' }}>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <p className="text-blue-200 text-xs font-semibold uppercase tracking-wide mb-1">
              {DIAS[now.getDay()]}, {now.getDate()} de {MESES[now.getMonth()]} de {now.getFullYear()}
            </p>
            <h1 className="text-2xl font-bold">Olá, {userName}! 👋</h1>
            <p className="text-blue-100 text-sm mt-1">
              {tenantName ? `${tenantName} · ` : ''}Visão geral da imobiliária
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            {[
              { label: 'Imóveis disponíveis', value: imoveis.filter(i => i.status === 'DISPONIVEL').length },
              { label: 'Matches ativos',      value: matchesAtivos },
              { label: 'Contratos aluguel',   value: contratos.length },
            ].map(k => (
              <div key={k.label} className="rounded-xl px-5 py-3.5 text-center min-w-[110px]"
                   style={{ background: 'rgba(255,255,255,0.15)' }}>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-blue-200 mb-1">{k.label}</p>
                <p className="text-2xl font-bold tabular-nums">{loading ? '—' : k.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Alerta de erro */}
      {apiError && !loading && (
        <div className="flex items-center gap-3 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>Não foi possível carregar alguns dados. Verifique se a API está no ar.</span>
          <button onClick={() => window.location.reload()}
            className="ml-auto shrink-0 text-xs font-medium underline hover:no-underline">
            Recarregar
          </button>
        </div>
      )}

      {/* ── KPIs ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatTile label="Matches ativos"
          value={loading ? <Skeleton /> : matchesAtivos}
          sub={!loading && <span style={{ color: '#16A34A' }} className="font-medium">{taxaConv}% convertidos</span>}
          icon={<GitMerge className="h-5 w-5" />} />
        <StatTile label="Novos leads"
          value={loading ? <Skeleton /> : novosLeads}
          sub={!loading && `${perfis.length} total · últimos 30 dias`}
          icon={<Users className="h-5 w-5" />} />
        <StatTile label="Taxa de conversão"
          value={loading ? <Skeleton /> : `${taxaConv}%`}
          sub={!loading && <><span className="font-medium">{convertidos}</span> de {matches.length} matches</>}
          icon={<TrendingUp className="h-5 w-5" />} />
        <StatTile label="Imóveis ativos"
          value={loading ? <Skeleton /> : imoveis.filter(i => i.status === 'DISPONIVEL').length}
          sub={!loading && <span className="flex items-center gap-1"><Layers className="h-3 w-3 inline" />{formatVGV(vgvAtivo)} VGV</span>}
          icon={<Home className="h-5 w-5" />} />
      </div>

      {/* ── Financeiro do mês + Ranking corretores ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Financeiro resumido */}
        <Card className="rounded-xl shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-emerald-500" />
                Financeiro — este mês
              </CardTitle>
              <Link href="/financeiro" className="flex items-center gap-1 text-xs text-primary font-medium hover:underline">
                Ver detalhes <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </CardHeader>
          <CardContent className="pt-2">
            {loading || !resumo ? (
              <div className="flex items-center justify-center h-24 text-sm text-muted-foreground">Carregando...</div>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: 'Total',    value: resumo.totalGeral,       color: 'text-foreground'   },
                    { label: 'Pago',     value: resumo.pago,             color: 'text-emerald-600'  },
                    { label: 'Pendente', value: resumo.pendente,         color: 'text-amber-600'    },
                  ].map(s => (
                    <div key={s.label} className="bg-secondary/50 rounded-lg p-3 text-center">
                      <p className="text-[11px] text-muted-foreground mb-1">{s.label}</p>
                      <p className={`text-base font-bold ${s.color}`}>R$ {fmtR(s.value)}</p>
                    </div>
                  ))}
                </div>
                {/* Barra pago vs pendente */}
                {(resumo.pago + resumo.pendente) > 0 && (
                  <div>
                    <div className="flex h-2.5 rounded-full overflow-hidden gap-px">
                      <div className="bg-emerald-500 h-full rounded-l-full transition-all"
                           style={{ width: `${(resumo.pago / (resumo.pago + resumo.pendente)) * 100}%` }} />
                      <div className="bg-amber-400 h-full rounded-r-full transition-all"
                           style={{ width: `${(resumo.pendente / (resumo.pago + resumo.pendente)) * 100}%` }} />
                    </div>
                    <div className="flex items-center gap-4 mt-1.5">
                      <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                        Pago ({Math.round((resumo.pago / (resumo.pago + resumo.pendente)) * 100)}%)
                      </span>
                      <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                        <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                        Pendente ({Math.round((resumo.pendente / (resumo.pago + resumo.pendente)) * 100)}%)
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Ranking corretores */}
        <Card className="rounded-xl shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Trophy className="h-4 w-4 text-amber-500" />
                Ranking de corretores
              </CardTitle>
              <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">matches ativos</span>
            </div>
          </CardHeader>
          <CardContent className="pt-2">
            {loading ? (
              <div className="flex items-center justify-center h-24 text-sm text-muted-foreground">Carregando...</div>
            ) : rankingCorretores.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground">Nenhum corretor cadastrado</div>
            ) : (
              <div className="space-y-2">
                {rankingCorretores.slice(0, 5).map((c, i) => {
                  const maxAtivos = rankingCorretores[0].ativos || 1
                  return (
                    <div key={c.id} className="flex items-center gap-3">
                      <span className={`w-5 text-center text-xs font-bold shrink-0 ${
                        i === 0 ? 'text-amber-500' : i === 1 ? 'text-slate-400' : i === 2 ? 'text-orange-400' : 'text-muted-foreground'
                      }`}>{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-xs font-medium truncate">{c.name}</span>
                          <span className="text-xs font-bold tabular-nums ml-2 shrink-0">{c.ativos} ativos</span>
                        </div>
                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full rounded-full bg-blue-500 transition-all"
                               style={{ width: `${(c.ativos / maxAtivos) * 100}%` }} />
                        </div>
                      </div>
                      {c.fechados > 0 && (
                        <span className="text-[11px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-semibold shrink-0">
                          {c.fechados} ✓
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Leads por mês ── */}
      <Card className="rounded-xl shadow-sm">
        <CardHeader className="pb-1">
          <CardTitle className="text-sm font-semibold">Leads por mês</CardTitle>
          <p className="text-xs text-muted-foreground">Perfis criados — últimos 6 meses</p>
        </CardHeader>
        <CardContent className="pt-0">
          {loading ? (
            <div className="flex items-center justify-center h-[200px] text-sm text-muted-foreground">Carregando...</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={leadsPerMonth} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="grad-primary" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#2563EB" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#DDE5F0" vertical={false} />
                <XAxis dataKey="mes" tick={{ fill: '#6B7B8D', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#6B7B8D', fontSize: 12 }} axisLine={false} tickLine={false} width={32} allowDecimals={false} />
                <ReTooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="leads" name="Leads" stroke="#2563EB" strokeWidth={2}
                      fill="url(#grad-primary)"
                      dot={{ r: 4, strokeWidth: 2, stroke: '#fff', fill: '#2563EB' }}
                      activeDot={{ r: 6 }} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* ── Funil do pipeline + Donut status ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 rounded-xl shadow-sm">
          <CardHeader className="pb-1">
            <CardTitle className="text-sm font-semibold">Funil do pipeline</CardTitle>
            <p className="text-xs text-muted-foreground">Matches por etapa com taxa de conversão</p>
          </CardHeader>
          <CardContent className="pt-3">
            {loading ? (
              <div className="flex items-center justify-center h-52 text-sm text-muted-foreground">Carregando...</div>
            ) : (
              <FunnelChart data={funilData} />
            )}
          </CardContent>
        </Card>

        <Card className="rounded-xl shadow-sm">
          <CardHeader className="pb-1">
            <CardTitle className="text-sm font-semibold">Imóveis por status</CardTitle>
            <p className="text-xs text-muted-foreground">Distribuição atual</p>
          </CardHeader>
          <CardContent className="pt-0">
            {loading ? (
              <div className="flex items-center justify-center h-[220px] text-sm text-muted-foreground">Carregando...</div>
            ) : (
              <DonutStatus imoveis={imoveis} />
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Últimos matches + Imóveis sem match ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        <Card className="rounded-xl shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-sm font-semibold">Últimos matches</CardTitle>
            <Link href="/matches?recentes=7" className="flex items-center gap-1 text-xs text-primary font-medium hover:underline">
              Ver todos <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </CardHeader>
          <CardContent className="pt-0">
            {loading ? (
              <p className="text-sm text-muted-foreground py-8 text-center">Carregando...</p>
            ) : matches.length === 0 ? (
              <div className="text-center py-10">
                <GitMerge className="h-8 w-8 mx-auto mb-2 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">Nenhum match ainda.</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {matches.slice(0, 7).map(m => {
                  const cor = m.etapa?.cor ?? '#6B7280'
                  return (
                    <div key={m.id} className="flex items-center justify-between py-2.5 gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{m.imovel.titulo}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {m.perfil.cliente?.nome ?? '—'} · {m.imovel.cidade.nome} · {formatDate(m.createdAt)}
                        </p>
                      </div>
                      <span className="shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full"
                            style={{ backgroundColor: `${cor}20`, color: cor, outline: `1px solid ${cor}50` }}>
                        {m.etapa?.nome ?? '—'}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-xl shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-amber-500" />
              Imóveis disponíveis sem match
            </CardTitle>
            <Link href="/imoveis?semMatch=1" className="flex items-center gap-1 text-xs text-primary font-medium hover:underline">
              Ver todos <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </CardHeader>
          <CardContent className="pt-0">
            {loading ? (
              <p className="text-sm text-muted-foreground py-8 text-center">Carregando...</p>
            ) : imoveisSemMatch.length === 0 ? (
              <div className="text-center py-10">
                <TrendingUp className="h-8 w-8 mx-auto mb-2 text-emerald-400" />
                <p className="text-sm text-muted-foreground">
                  {imoveis.filter(i => i.status === 'DISPONIVEL').length === 0
                    ? 'Nenhum imóvel disponível cadastrado.'
                    : '✅ Todos os imóveis disponíveis têm match!'}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {imoveisSemMatch.map(i => (
                  <div key={i.id} className="flex items-center justify-between py-2.5 gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{i.titulo}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {i.tipo?.nome} · {i.bairro}, {i.cidade.nome} · {formatCurrency(i.preco)}
                      </p>
                    </div>
                    <span className={`shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full ${
                      i.finalidade === 'VENDA'
                        ? 'bg-violet-50 text-violet-700 ring-1 ring-violet-200'
                        : 'bg-orange-50 text-orange-700 ring-1 ring-orange-200'
                    }`}>
                      {i.finalidade === 'VENDA' ? 'Venda' : 'Aluguel'}
                    </span>
                  </div>
                ))}
                {imoveis.filter(i => i.status === 'DISPONIVEL' && !idsComMatch.has(i.id)).length > 6 && (
                  <p className="text-xs text-muted-foreground pt-2 text-center">
                    +{imoveis.filter(i => i.status === 'DISPONIVEL' && !idsComMatch.has(i.id)).length - 6} imóveis sem match
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
