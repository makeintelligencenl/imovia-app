'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useState } from 'react'
import { Home, Users, GitMerge, TrendingUp, ArrowRight, DollarSign, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { api } from '@/lib/api'
import { formatCurrency } from '@/lib/utils'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts'

// â”€â”€ Tipos â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
interface Imovel {
  id: string; titulo: string; preco: number; cidade: string; bairro: string
  finalidade: string; status: string
  tipo: { nome: string }
}
interface Perfil { id: string; clienteNome: string }
interface Match {
  id: string; status: string; createdAt: string
  imovel: { id: string; titulo: string; preco: number; cidade: string }
  perfil: { clienteNome: string }
}

// â”€â”€ Constantes â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const STATUS_FUNIL = [
  { key: 'NOTIFICADO',    label: 'Notificado',    color: '#94A3B8' },
  { key: 'VISUALIZADO',   label: 'Visualizado',   color: '#60A5FA' },
  { key: 'INTERESSADO',   label: 'Interessado',   color: '#FBBF24' },
  { key: 'EM_NEGOCIACAO', label: 'Em negociação', color: '#F97316' },
  { key: 'FECHADO',       label: 'Fechado',       color: '#34D399' },
  { key: 'DESCARTADO',    label: 'Descartado',    color: '#F87171' },
]

const STATUS_BADGE: Record<string, string> = {
  NOTIFICADO:    'bg-slate-100 text-slate-600 ring-1 ring-slate-200',
  VISUALIZADO:   'bg-blue-50 text-blue-700 ring-1 ring-blue-200',
  INTERESSADO:   'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
  EM_NEGOCIACAO: 'bg-orange-50 text-orange-700 ring-1 ring-orange-200',
  FECHADO:       'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  DESCARTADO:    'bg-red-50 text-red-600 ring-1 ring-red-200',
}
const STATUS_LABEL: Record<string, string> = {
  NOTIFICADO: 'Notificado', VISUALIZADO: 'Visualizado', INTERESSADO: 'Interessado',
  EM_NEGOCIACAO: 'Em negociação', FECHADO: 'Fechado', DESCARTADO: 'Descartado',
}

const DONUT_COLORS = ['#3B82F6','#8B5CF6','#F59E0B','#10B981','#EF4444','#06B6D4','#EC4899']

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

// â”€â”€ Componente Donut simples â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function DonutChart({ data, title }: { data: { name: string; value: number }[]; title: string }) {
  const total = data.reduce((s, d) => s + d.value, 0)
  return (
    <Card className="rounded-xl shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {total === 0 ? (
          <div className="flex items-center justify-center h-[180px] text-sm text-muted-foreground">Sem dados</div>
        ) : (
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={data} cx="50%" cy="50%" innerRadius={48} outerRadius={72}
                dataKey="value" paddingAngle={2}>
                {data.map((_, i) => (
                  <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(v: number) => [`${v} (${Math.round(v / total * 100)}%)`, '']} />
              <Legend iconType="circle" iconSize={8}
                formatter={(v) => <span className="text-xs text-muted-foreground">{v}</span>} />
            </PieChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}

// â”€â”€ Página â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export default function DashboardPage() {
  const [imoveis,  setImoveis]  = useState<Imovel[]>([])
  const [perfis,   setPerfis]   = useState<Perfil[]>([])
  const [matches,  setMatches]  = useState<Match[]>([])
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    Promise.all([
      api.get<Imovel[]>('/imoveis'),
      api.get<Perfil[]>('/perfis'),
      api.get<Match[]>('/matches'),
    ]).then(([im, pe, ma]) => {
      setImoveis(im); setPerfis(pe); setMatches(ma)
    }).finally(() => setLoading(false))
  }, [])

  // â”€â”€ Derivações â”€â”€
  const hoje        = new Date().toDateString()
  const disponiveis = imoveis.filter((i) => i.status === 'DISPONIVEL').length
  const vendidos    = imoveis.filter((i) => ['VENDIDO', 'ALUGADO'].includes(i.status)).length
  const matchesHoje = matches.filter((m) => new Date(m.createdAt).toDateString() === hoje).length
  const fechados    = matches.filter((m) => m.status === 'FECHADO').length
  const taxaConv    = matches.length ? Math.round(fechados / matches.length * 100) : 0
  const ticketMedio = imoveis.length
    ? imoveis.reduce((s, i) => s + Number(i.preco), 0) / imoveis.length
    : 0

  // Funil de matches
  const funilData = STATUS_FUNIL.map((s) => ({
    name:  s.label,
    total: matches.filter((m) => m.status === s.key).length,
    color: s.color,
  }))

  // Donut â€” tipos de imóvel
  const tiposMap: Record<string, number> = {}
  imoveis.forEach((i) => { tiposMap[i.tipo?.nome ?? 'Outros'] = (tiposMap[i.tipo?.nome ?? 'Outros'] ?? 0) + 1 })
  const tiposData = Object.entries(tiposMap).map(([name, value]) => ({ name, value }))

  // Donut â€” finalidade
  const finalidadeData = [
    { name: 'Venda',   value: imoveis.filter((i) => i.finalidade === 'VENDA').length   },
    { name: 'Aluguel', value: imoveis.filter((i) => i.finalidade === 'ALUGUEL').length },
  ].filter((d) => d.value > 0)

  // Imóveis sem match
  const idsComMatch = new Set(matches.map((m) => m.imovel.id))
  const imoveisSemMatch = imoveis
    .filter((i) => i.status === 'DISPONIVEL' && !idsComMatch.has(i.id))
    .slice(0, 6)

  const Skeleton = () => <span className="text-muted-foreground/30">â€”</span>

  return (
    <div className="space-y-6">
      {/* â”€â”€ Cabeçalho â”€â”€ */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Visão geral da sua imobiliária</p>
      </div>

      {/* â”€â”€ KPIs â”€â”€ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Imóveis */}
        <Card className="rounded-xl shadow-sm border-l-4 border-l-blue-500">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Imóveis</p>
                <p className="text-3xl font-bold mt-2 tabular-nums">
                  {loading ? <Skeleton /> : imoveis.length}
                </p>
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
                <p className="text-3xl font-bold mt-2 tabular-nums">
                  {loading ? <Skeleton /> : perfis.length}
                </p>
                {!loading && (
                  <p className="text-xs text-muted-foreground mt-1">clientes buscando imóvel</p>
                )}
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
                <p className="text-3xl font-bold mt-2 tabular-nums">
                  {loading ? <Skeleton /> : matches.length}
                </p>
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

        {/* Ticket médio */}
        <Card className="rounded-xl shadow-sm border-l-4 border-l-amber-500">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Ticket médio</p>
                <p className="text-2xl font-bold mt-2 tabular-nums">
                  {loading ? <Skeleton /> : formatCurrency(ticketMedio)}
                </p>
                {!loading && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {fechados > 0
                      ? <span className="text-emerald-600 font-medium">{fechados} negócio(s) fechado(s)</span>
                      : 'média dos imóveis ativos'}
                  </p>
                )}
              </div>
              <div className="p-2.5 rounded-xl bg-amber-50 shrink-0">
                <DollarSign className="h-5 w-5 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* â”€â”€ Gráficos: Funil + Donuts â”€â”€ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Funil de matches (ocupa 1/3) */}
        <Card className="rounded-xl shadow-sm lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Funil de matches</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {loading || matches.length === 0 ? (
              <div className="flex items-center justify-center h-[220px] text-sm text-muted-foreground">
                {loading ? 'Carregando...' : 'Sem matches ainda'}
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={funilData} layout="vertical" margin={{ left: 8, right: 24 }}>
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 11 }} />
                  <Tooltip
                    cursor={{ fill: 'rgba(0,0,0,0.04)' }}
                    formatter={(v: number) => [v, 'matches']}
                  />
                  <Bar dataKey="total" radius={[0, 4, 4, 0]} maxBarSize={20}>
                    {funilData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Donut tipos */}
        <DonutChart data={tiposData} title="Imóveis por tipo" />

        {/* Donut finalidade */}
        <DonutChart data={finalidadeData} title="Imóveis por finalidade" />
      </div>

      {/* â”€â”€ Linha inferior: Últimos matches + Imóveis sem match â”€â”€ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Últimos matches */}
        <Card className="rounded-xl shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-sm font-semibold">Últimos matches</CardTitle>
            <Link href="/dashboard/matches"
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
                {matches.slice(0, 7).map((m) => (
                  <div key={m.id} className="flex items-center justify-between py-2.5 gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{m.imovel.titulo}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {m.perfil.clienteNome} · {m.imovel.cidade} · {formatDate(m.createdAt)}
                      </p>
                    </div>
                    <span className={`shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_BADGE[m.status] ?? ''}`}>
                      {STATUS_LABEL[m.status] ?? m.status}
                    </span>
                  </div>
                ))}
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
            <Link href="/dashboard/imoveis"
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
                        {i.tipo?.nome} · {i.bairro}, {i.cidade} · {formatCurrency(i.preco)}
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
