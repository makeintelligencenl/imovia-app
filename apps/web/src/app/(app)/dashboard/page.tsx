'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Home, Users, GitMerge, TrendingUp, ArrowRight, Layers, AlertCircle } from 'lucide-react'
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

// ── Custom Tooltip (obrigatório — nunca usar o default do Recharts) ────────────
function CustomTooltip({ active, payload, label }: TooltipProps<ValueType, NameType>) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-border bg-white px-3 py-2 shadow-md text-sm">
      {label && <p className="mb-1 font-medium text-foreground">{label}</p>}
      {payload.map((entry, i) => (
        <div key={i} className="flex items-center gap-2">
          <span
            className="inline-block h-2 w-2 rounded-full"
            style={{ backgroundColor: entry.color as string }}
          />
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
  id: string; etapaId: string; etapa: PipelineEtapa; createdAt: string
  imovel: { id: string; titulo: string; preco: number; cidade: { nome: string } }
  perfil: { cliente: { nome: string } }
}

// ── KPI Tile ──────────────────────────────────────────────────────────────────
function StatTile({
  label, value, sub, icon,
}: { label: string; value: React.ReactNode; sub?: React.ReactNode; icon: React.ReactNode }) {
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

// ── Funil SVG — visual por posição (largura decresce por rank, não por valor) ──
function FunnelChart({ data }: { data: { name: string; total: number; color: string }[] }) {
  if (!data.length || data.every((d) => d.total === 0)) {
    return (
      <div className="flex items-center justify-center h-52 text-sm text-muted-foreground">
        Sem matches ainda
      </div>
    )
  }

  const n       = data.length
  const STEP_H  = 44          // altura de cada banda
  const GAP     = 1           // separador branco entre bandas
  const TOP_W   = 340         // metade-topo da primeira banda
  const BOT_W   = 36          // metade-base da última banda
  const LABEL_W = 120         // espaço à esquerda para labels
  const SVG_W   = LABEL_W + TOP_W * 2 + 24
  const cx      = LABEL_W + TOP_W  // centro horizontal do funil
  const totalH  = n * STEP_H + (n - 1) * GAP

  // Largura de cada borda (topo/base) decresce linearmente por rank
  const halfAt = (rank: number) =>
    Math.round(TOP_W - (TOP_W - BOT_W) * (rank / (n - 1 || 1)))

  const stages = data.map((d, i) => {
    const topH = halfAt(i)
    const botH = i < n - 1 ? halfAt(i + 1) : BOT_W
    const y    = i * (STEP_H + GAP)
    const pct  = data[0].total > 0 ? Math.round((d.total / data[0].total) * 100) : 0
    const midY = y + STEP_H / 2
    // Largura mínima da banda no centro para decidir se mostra label interno
    const midW = (topH + botH) / 2
    return { ...d, topH, botH, y, pct, midY, midW,
      points: `${cx-topH},${y} ${cx+topH},${y} ${cx+botH},${y+STEP_H} ${cx-botH},${y+STEP_H}` }
  })

  return (
    <svg width="100%" viewBox={`0 0 ${SVG_W} ${totalH}`} style={{ display: 'block' }}>
      {stages.map((s, i) => (
        <g key={i}>
          <polygon points={s.points} fill={s.color} />

          {/* Label à esquerda com linha tracejada */}
          <text x={LABEL_W - 10} y={s.midY + 4}
            textAnchor="end" fontSize={12} fill="#6B7B8D" fontFamily="inherit">
            {s.name}
          </text>
          <line
            x1={LABEL_W - 4} y1={s.midY}
            x2={cx - s.topH + 8} y2={s.midY}
            stroke="#DDE5F0" strokeWidth={1} strokeDasharray="3 2"
          />

          {/* Valor + % dentro da banda */}
          {s.midW > 30 ? (
            <>
              <text x={cx} y={s.midY - 4} textAnchor="middle"
                fontSize={13} fontWeight="700" fill="#fff" fontFamily="inherit">
                {s.total}
              </text>
              <text x={cx} y={s.midY + 12} textAnchor="middle"
                fontSize={11} fill="rgba(255,255,255,0.82)" fontFamily="inherit">
                {s.pct}%
              </text>
            </>
          ) : (
            /* Banda muito estreita: label externo à direita */
            <>
              <line x1={cx + s.topH} y1={s.midY} x2={cx + s.topH + 10} y2={s.midY}
                stroke={s.color} strokeWidth={1} strokeDasharray="2 2"/>
              <text x={cx + s.topH + 14} y={s.midY - 3}
                fontSize={11} fontWeight="700" fill={s.color} fontFamily="inherit">
                {s.total}
              </text>
              <text x={cx + s.topH + 14} y={s.midY + 10}
                fontSize={10} fill="#6B7B8D" fontFamily="inherit">
                {s.pct}%
              </text>
            </>
          )}
        </g>
      ))}
    </svg>
  )
}

// ── Donut de status ────────────────────────────────────────────────────────────
function DonutStatus({ imoveis }: { imoveis: Imovel[] }) {
  const map: Record<string, number> = {}
  imoveis.forEach((i) => { map[i.status] = (map[i.status] ?? 0) + 1 })
  const data = Object.entries(map)
    .map(([status, value]) => ({
      name:  STATUS_LABELS[status] ?? status,
      value,
      color: STATUS_COLORS[status] ?? '#9CA3AF',
    }))
    .filter((d) => d.value > 0)
  const total = data.reduce((s, d) => s + d.value, 0)

  const centerLabel = ({ viewBox }: any) => {
    const { cx, cy } = viewBox ?? {}
    return (
      <g>
        <text x={cx} y={cy - 6} textAnchor="middle" fontSize={22} fontWeight="700" fill="#1E2D5A">
          {total}
        </text>
        <text x={cx} y={cy + 11} textAnchor="middle" fontSize={10} fill="#6B7B8D">
          imóveis
        </text>
      </g>
    )
  }

  if (total === 0) {
    return (
      <div className="flex items-center justify-center h-52 text-sm text-muted-foreground">
        Sem imóveis
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie
          data={data}
          cx="50%" cy="44%"
          innerRadius="58%" outerRadius="78%"
          dataKey="value"
          paddingAngle={2}
          stroke="#F5F8FC"
          strokeWidth={2}
          labelLine={false}
        >
          {data.map((d, i) => <Cell key={i} fill={d.color} />)}
          <Label content={centerLabel} position="center" />
        </Pie>
        <ReTooltip content={<CustomTooltip />} />
        <Legend
          iconType="circle"
          iconSize={8}
          formatter={(value) => {
            const item = data.find((d) => d.name === value)
            const pct  = item ? Math.round((item.value / total) * 100) : 0
            return (
              <span className="text-xs text-muted-foreground">
                {value}{' '}
                <span className="font-semibold text-foreground">{item?.value}</span>
                <span className="text-muted-foreground/70"> ({pct}%)</span>
              </span>
            )
          }}
        />
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

/** Agrupa perfis por mês de criação — últimos 6 meses */
function buildLeadsPerMonth(perfis: Perfil[]) {
  const now = new Date()
  return Array.from({ length: 6 }, (_, i) => {
    const d    = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1)
    const label = d.toLocaleDateString('pt-BR', { month: 'short' })
      .replace('.', '').replace(/^\w/, (c) => c.toUpperCase())
    const leads = perfis.filter((p) => {
      const pd = new Date(p.createdAt)
      return pd.getFullYear() === d.getFullYear() && pd.getMonth() === d.getMonth()
    }).length
    return { mes: label, leads }
  })
}

// ── Página ────────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const router    = useRouter()
  const [imoveis, setImoveis]  = useState<Imovel[]>([])
  const [perfis,  setPerfis]   = useState<Perfil[]>([])
  const [matches, setMatches]  = useState<Match[]>([])
  const [etapas,  setEtapas]   = useState<PipelineEtapa[]>([])
  const [loading, setLoading]  = useState(true)
  const [apiError,setApiError] = useState(false)

  useEffect(() => {
    const user = getCurrentUser()
    if (user?.role === 'CORRETOR') { router.replace('/corretor'); return }
  }, [router])

  useEffect(() => {
    const user = getCurrentUser()
    if (user?.role === 'CORRETOR') return

    const loadAll = async () => {
      setLoading(true); setApiError(false)
      let hasError = false
      const [im, pe, ma, et] = await Promise.allSettled([
        api.get<Imovel[]>('/imoveis'),
        api.get<Perfil[]>('/perfis'),
        api.get<Match[]>('/matches'),
        api.get<PipelineEtapa[]>('/pipeline/etapas'),
      ])
      if (im.status === 'fulfilled') setImoveis(im.value)
      else { console.error('Erro imóveis:', im.reason); hasError = true }
      if (pe.status === 'fulfilled') setPerfis(pe.value)
      else { console.error('Erro perfis:', pe.reason); hasError = true }
      if (ma.status === 'fulfilled') setMatches(ma.value)
      else { console.error('Erro matches:', ma.reason); hasError = true }
      if (et.status === 'fulfilled') setEtapas(et.value)
      else console.warn('Erro etapas:', et.reason)
      if (hasError) setApiError(true)
      setLoading(false)
    }
    loadAll()
  }, [])

  // ── Derivações ────────────────────────────────────────────────────────────
  const cutoff30     = new Date(); cutoff30.setDate(cutoff30.getDate() - 30)
  const novosLeads   = perfis.filter((p) => new Date(p.createdAt) >= cutoff30).length

  const etapaEncerrada = etapas.find((e: any) => e.tipo === 'ENCERRADO') ?? (etapas.length >= 1 ? etapas[etapas.length - 1] : null)
  const etapaFechado   = etapas.find((e: any) => e.tipo === 'FECHADO')   ?? (etapas.length >= 2 ? etapas[etapas.length - 2] : null)
  const convertidos    = etapaFechado ? matches.filter((m) => m.etapaId === etapaFechado.id).length : 0
  const taxaConv       = matches.length ? Math.round((convertidos / matches.length) * 100) : 0
  const matchesAtivos  = matches.filter((m) => m.etapaId !== etapaEncerrada?.id).length

  const vgvAtivo = (() => {
    const seen = new Set<string>(); let total = 0
    for (const m of matches) {
      if (m.etapaId === etapaEncerrada?.id) continue
      if (!seen.has(m.imovel.id)) { seen.add(m.imovel.id); total += Number(m.imovel.preco) }
    }
    return total
  })()

  const funilData      = etapas.map((e) => ({
    name:  e.nome,
    total: matches.filter((m) => m.etapaId === e.id).length,
    color: e.cor,
  }))

  const leadsPerMonth  = buildLeadsPerMonth(perfis)
  const idsComMatch    = new Set(matches.map((m) => m.imovel.id))
  const imoveisSemMatch = imoveis
    .filter((i) => i.status === 'DISPONIVEL' && !idsComMatch.has(i.id))
    .slice(0, 6)

  const Skeleton = () => <span className="text-muted-foreground/30">—</span>

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Visão geral da sua imobiliária</p>
      </div>

      {/* Alerta de erro */}
      {apiError && !loading && (
        <div className="flex items-center gap-3 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>Não foi possível carregar alguns dados. Verifique se a API está no ar.</span>
          <button
            onClick={() => window.location.reload()}
            className="ml-auto shrink-0 text-xs font-medium underline hover:no-underline"
          >
            Recarregar
          </button>
        </div>
      )}

      {/* ── KPIs ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatTile
          label="Matches ativos"
          value={loading ? <Skeleton /> : matchesAtivos}
          sub={!loading && (
            <span style={{ color: '#16A34A' }} className="font-medium">{taxaConv}% convertidos</span>
          )}
          icon={<GitMerge className="h-5 w-5" />}
        />
        <StatTile
          label="Novos leads"
          value={loading ? <Skeleton /> : novosLeads}
          sub={!loading && `${perfis.length} total · últimos 30 dias`}
          icon={<Users className="h-5 w-5" />}
        />
        <StatTile
          label="Taxa de conversão"
          value={loading ? <Skeleton /> : `${taxaConv}%`}
          sub={!loading && <><span className="font-medium">{convertidos}</span> de {matches.length} matches</>}
          icon={<TrendingUp className="h-5 w-5" />}
        />
        <StatTile
          label="Imóveis ativos"
          value={loading ? <Skeleton /> : imoveis.filter((i) => i.status === 'DISPONIVEL').length}
          sub={!loading && (
            <span className="flex items-center gap-1">
              <Layers className="h-3 w-3 inline" />
              {formatVGV(vgvAtivo)} VGV em carteira
            </span>
          )}
          icon={<Home className="h-5 w-5" />}
        />
      </div>

      {/* ── Leads por mês (linha única) ── */}
      <Card className="rounded-xl shadow-sm">
        <CardHeader className="pb-1">
          <CardTitle className="text-sm font-semibold">Leads por mês</CardTitle>
          <p className="text-xs text-muted-foreground">Perfis criados — últimos 6 meses</p>
        </CardHeader>
        <CardContent className="pt-0">
          {loading ? (
            <div className="flex items-center justify-center h-[200px] text-sm text-muted-foreground">
              Carregando...
            </div>
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
                <XAxis
                  dataKey="mes"
                  tick={{ fill: '#6B7B8D', fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: '#6B7B8D', fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                  width={32}
                  allowDecimals={false}
                />
                <ReTooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="leads"
                  name="Leads"
                  stroke="#2563EB"
                  strokeWidth={2}
                  fill="url(#grad-primary)"
                  dot={{ r: 4, strokeWidth: 2, stroke: '#fff', fill: '#2563EB' }}
                  activeDot={{ r: 6 }}
                />
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
            <p className="text-xs text-muted-foreground">Matches por etapa</p>
          </CardHeader>
          <CardContent className="pt-3">
            {loading ? (
              <div className="flex items-center justify-center h-52 text-sm text-muted-foreground">
                Carregando...
              </div>
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
              <div className="flex items-center justify-center h-[220px] text-sm text-muted-foreground">
                Carregando...
              </div>
            ) : (
              <DonutStatus imoveis={imoveis} />
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Últimos matches + Imóveis sem match ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Últimos matches */}
        <Card className="rounded-xl shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-sm font-semibold">Últimos matches</CardTitle>
            <Link
              href="/matches?recentes=7"
              className="flex items-center gap-1 text-xs text-primary font-medium hover:underline"
            >
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
                {matches.slice(0, 7).map((m) => {
                  const cor = m.etapa?.cor ?? '#6B7280'
                  return (
                    <div key={m.id} className="flex items-center justify-between py-2.5 gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{m.imovel.titulo}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {m.perfil.cliente?.nome ?? '—'} · {m.imovel.cidade.nome} · {formatDate(m.createdAt)}
                        </p>
                      </div>
                      <span
                        className="shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: `${cor}20`, color: cor, outline: `1px solid ${cor}50` }}
                      >
                        {m.etapa?.nome ?? '—'}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Imóveis sem match */}
        <Card className="rounded-xl shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-amber-500" />
              Imóveis disponíveis sem match
            </CardTitle>
            <Link
              href="/imoveis?semMatch=1"
              className="flex items-center gap-1 text-xs text-primary font-medium hover:underline"
            >
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
                  {imoveis.filter((i) => i.status === 'DISPONIVEL').length === 0
                    ? 'Nenhum imóvel disponível cadastrado.'
                    : '✅ Todos os imóveis disponíveis têm match!'}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {imoveisSemMatch.map((i) => (
                  <div key={i.id} className="flex items-center justify-between py-2.5 gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{i.titulo}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {i.tipo?.nome} · {i.bairro}, {i.cidade.nome} · {formatCurrency(i.preco)}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full ${
                        i.finalidade === 'VENDA'
                          ? 'bg-violet-50 text-violet-700 ring-1 ring-violet-200'
                          : 'bg-orange-50 text-orange-700 ring-1 ring-orange-200'
                      }`}
                    >
                      {i.finalidade === 'VENDA' ? 'Venda' : 'Aluguel'}
                    </span>
                  </div>
                ))}
                {imoveis.filter((i) => i.status === 'DISPONIVEL' && !idsComMatch.has(i.id)).length > 6 && (
                  <p className="text-xs text-muted-foreground pt-2 text-center">
                    +{imoveis.filter((i) => i.status === 'DISPONIVEL' && !idsComMatch.has(i.id)).length - 6} imóveis sem match
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
