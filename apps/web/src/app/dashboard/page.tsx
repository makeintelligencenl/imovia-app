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
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LabelList,
  PieChart, Pie, Cell, Legend, Label,
} from 'recharts'

// ── Tipos ─────────────────────────────────────────────────────────────────────
interface PipelineEtapa { id: string; nome: string; cor: string; ordem: number }
interface Imovel {
  id: string; titulo: string; preco: number; bairro: string
  finalidade: string; status: string
  tipo: { nome: string }
  cidade: { nome: string }
}
interface Perfil  { id: string; clienteNome: string }
interface Match {
  id: string; etapaId: string; etapa: PipelineEtapa; createdAt: string
  imovel: { id: string; titulo: string; preco: number; cidade: { nome: string } }
  perfil: { clienteNome: string }
}

const DONUT_COLORS = ['#3B82F6','#8B5CF6','#F59E0B','#10B981','#EF4444','#06B6D4','#EC4899']

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

/** Formata grandes valores em M / K */
function formatVGV(value: number): string {
  if (value >= 1_000_000_000) return `R$ ${(value / 1_000_000_000).toFixed(1)}Bi`
  if (value >= 1_000_000)     return `R$ ${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000)         return `R$ ${(value / 1_000).toFixed(0)}K`
  return formatCurrency(value)
}

// ── Label adaptativa dentro/fora da barra ─────────────────────────────────────
function BarLabel(props: any) {
  const { x, y, width, height, value } = props
  if (!value) return null
  const insideBar = height > 26
  return (
    <text
      x={x + width / 2}
      y={insideBar ? y + 15 : y - 5}
      textAnchor="middle"
      fill={insideBar ? '#ffffff' : '#374151'}
      fontSize={11}
      fontWeight="700"
    >
      {value}
    </text>
  )
}

// ── Componente Donut ──────────────────────────────────────────────────────────
function DonutChart({ data, title }: { data: { name: string; value: number }[]; title: string }) {
  const total = data.reduce((s, d) => s + d.value, 0)

  const centerLabel = ({ viewBox }: any) => {
    const { cx, cy } = viewBox ?? {}
    return (
      <g>
        <text x={cx} y={cy - 6} textAnchor="middle" fontSize={22} fontWeight="700" fill="#111827">
          {total}
        </text>
        <text x={cx} y={cy + 11} textAnchor="middle" fontSize={10} fill="#6B7280">
          imóveis
        </text>
      </g>
    )
  }

  return (
    <Card className="rounded-xl shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {total === 0 ? (
          <div className="flex items-center justify-center h-[200px] text-sm text-muted-foreground">Sem dados</div>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={data}
                cx="50%" cy="44%"
                innerRadius={46} outerRadius={68}
                dataKey="value"
                paddingAngle={2}
                labelLine={false}
              >
                {data.map((_, i) => <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />)}
                <Label content={centerLabel} position="center" />
              </Pie>
              <Tooltip formatter={(v: number) => [`${v} (${Math.round(v / total * 100)}%)`, '']} />
              <Legend
                iconType="circle"
                iconSize={8}
                formatter={(value) => {
                  const item = data.find((d) => d.name === value)
                  const pct  = item ? Math.round(item.value / total * 100) : 0
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
        )}
      </CardContent>
    </Card>
  )
}

// ── Página ────────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const router     = useRouter()
  const [imoveis,  setImoveis]  = useState<Imovel[]>([])
  const [perfis,   setPerfis]   = useState<Perfil[]>([])
  const [matches,  setMatches]  = useState<Match[]>([])
  const [etapas,   setEtapas]   = useState<PipelineEtapa[]>([])
  const [loading,  setLoading]  = useState(true)
  const [apiError, setApiError] = useState(false)

  useEffect(() => {
    // Corretores vao para o dashboard deles
    const user = getCurrentUser()
    if (user?.role === 'CORRETOR') { router.replace('/dashboard/corretor'); return }
  }, [router])

  useEffect(() => {
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
  const hoje        = new Date().toDateString()
  const disponiveis = imoveis.filter((i) => i.status === 'DISPONIVEL').length
  const vendidos    = imoveis.filter((i) => ['VENDIDO', 'ALUGADO'].includes(i.status)).length
  const matchesHoje = matches.filter((m) => new Date(m.createdAt).toDateString() === hoje).length

  // Ultima etapa = Encerrado (cancelado/perdido) — penultima = Fechado (conversao real)
  const etapaEncerrada = etapas.length >= 1 ? etapas[etapas.length - 1] : null
  const etapaFechado   = etapas.length >= 2 ? etapas[etapas.length - 2] : null
  const convertidos    = etapaFechado ? matches.filter((m) => m.etapaId === etapaFechado.id).length : 0
  const taxaConv       = matches.length ? Math.round(convertidos / matches.length * 100) : 0

  // VGV em Carteira: soma única dos preços dos imóveis com match ativo (excluindo Encerrado)
  const vgvAtivo = (() => {
    const seen = new Set<string>()
    let total = 0
    for (const m of matches) {
      if (m.etapaId === etapaEncerrada?.id) continue
      if (!seen.has(m.imovel.id)) {
        seen.add(m.imovel.id)
        total += Number(m.imovel.preco)
      }
    }
    return total
  })()
  const matchesAtivos = matches.filter((m) => m.etapaId !== etapaEncerrada?.id).length

  // Funil
  const funilData = etapas.map((e) => ({
    name:  e.nome,
    total: matches.filter((m) => m.etapaId === e.id).length,
    color: e.cor,
  }))

  // Donuts
  const tiposMap: Record<string, number> = {}
  imoveis.forEach((i) => { tiposMap[i.tipo?.nome ?? 'Outros'] = (tiposMap[i.tipo?.nome ?? 'Outros'] ?? 0) + 1 })
  const tiposData = Object.entries(tiposMap).map(([name, value]) => ({ name, value }))
  const finalidadeData = [
    { name: 'Venda',   value: imoveis.filter((i) => i.finalidade === 'VENDA').length   },
    { name: 'Aluguel', value: imoveis.filter((i) => i.finalidade === 'ALUGUEL').length },
  ].filter((d) => d.value > 0)

  // Imóveis sem match
  const idsComMatch     = new Set(matches.map((m) => m.imovel.id))
  const imoveisSemMatch = imoveis
    .filter((i) => i.status === 'DISPONIVEL' && !idsComMatch.has(i.id))
    .slice(0, 6)

  const Skeleton = () => <span className="text-muted-foreground/30">—</span>

  return (
    <div className="space-y-6">
      {/* ── Cabeçalho ── */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Visão geral da sua imobiliária</p>
      </div>

      {/* ── Alerta de erro ── */}
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

        {/* Imóveis */}
        <Card className="rounded-xl shadow-sm border-l-4 border-l-blue-500">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Imóveis</p>
                <p className="text-3xl font-bold mt-2 tabular-nums">{loading ? <Skeleton /> : imoveis.length}</p>
                {!loading && (
                  <p className="text-xs text-muted-foreground mt-1">
                    <span className="text-emerald-600 font-medium">{disponiveis} disponíveis</span>
                    {vendidos > 0 && ` · ${vendidos} concluídos`}
                  </p>
                )}
              </div>
              <div className="p-2.5 rounded-xl bg-blue-50 shrink-0">
                <Home className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Perfis */}
        <Card className="rounded-xl shadow-sm border-l-4 border-l-violet-500">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Perfis ativos</p>
                <p className="text-3xl font-bold mt-2 tabular-nums">{loading ? <Skeleton /> : perfis.length}</p>
                {!loading && <p className="text-xs text-muted-foreground mt-1">clientes buscando imóvel</p>}
              </div>
              <div className="p-2.5 rounded-xl bg-violet-50 shrink-0">
                <Users className="h-5 w-5 text-violet-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Matches */}
        <Card className="rounded-xl shadow-sm border-l-4 border-l-emerald-500">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Matches</p>
                <p className="text-3xl font-bold mt-2 tabular-nums">{loading ? <Skeleton /> : matches.length}</p>
                {!loading && (
                  <p className="text-xs text-muted-foreground mt-1">
                    <span className="text-emerald-600 font-medium">{taxaConv}% convertidos</span>
                    {matchesHoje > 0 && ` · ${matchesHoje} hoje`}
                  </p>
                )}
              </div>
              <div className="p-2.5 rounded-xl bg-emerald-50 shrink-0">
                <GitMerge className="h-5 w-5 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* VGV em Carteira */}
        <Card className="rounded-xl shadow-sm border-l-4 border-l-amber-500">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">VGV em Carteira</p>
                <p className="text-2xl font-bold mt-2 tabular-nums">
                  {loading ? <Skeleton /> : formatVGV(vgvAtivo)}
                </p>
                {!loading && (
                  <p className="text-xs text-muted-foreground mt-1">
                    <span className="text-amber-600 font-medium">{matchesAtivos} match(es) ativo(s)</span>
                    {' · excluindo encerrados'}
                  </p>
                )}
              </div>
              <div className="p-2.5 rounded-xl bg-amber-50 shrink-0">
                <Layers className="h-5 w-5 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Funil do pipeline (largura total) ── */}
      <Card className="rounded-xl shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Funil do pipeline</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {loading || matches.length === 0 ? (
            <div className="flex items-center justify-center h-[240px] text-sm text-muted-foreground">
              {loading ? 'Carregando...' : 'Sem matches ainda'}
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={funilData} margin={{ top: 20, right: 16, left: 8, bottom: 48 }}>
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  angle={-25}
                  textAnchor="end"
                  interval={0}
                  height={60}
                />
                <YAxis hide />
                <Tooltip
                  cursor={{ fill: 'rgba(0,0,0,0.04)' }}
                  formatter={(v: number) => [v, 'matches']}
                />
                <Bar dataKey="total" radius={[6, 6, 0, 0]} maxBarSize={72}>
                  {funilData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                  <LabelList dataKey="total" content={BarLabel} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* ── Donuts ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <DonutChart data={tiposData}      title="Imóveis por tipo" />
        <DonutChart data={finalidadeData} title="Imóveis por finalidade" />
      </div>

      {/* ── Últimos matches + Imóveis sem match ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Últimos matches */}
        <Card className="rounded-xl shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-sm font-semibold">Últimos matches</CardTitle>
            <Link href="/dashboard/matches?recentes=7"
              className="flex items-center gap-1 text-xs text-primary font-medium hover:underline">
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
                          {m.perfil.clienteNome} · {m.imovel.cidade.nome} · {formatDate(m.createdAt)}
                        </p>
                      </div>
                      <span
                        className="shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: cor + '20', color: cor, outline: `1px solid ${cor}50` }}
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
            <Link href="/dashboard/imoveis?semMatch=1"
              className="flex items-center gap-1 text-xs text-primary font-medium hover:underline">
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
                    <span className={`shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full ${
                      i.finalidade === 'VENDA'
                        ? 'bg-violet-50 text-violet-700 ring-1 ring-violet-200'
                        : 'bg-orange-50 text-orange-700 ring-1 ring-orange-200'
                    }`}>
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
