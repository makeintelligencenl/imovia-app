'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { GitMerge, TrendingUp, CheckCircle2, BarChart3, ArrowRight, Clock } from 'lucide-react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { api } from '@/lib/api'
import { getCurrentUser } from '@/lib/auth'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LabelList, Cell,
} from 'recharts'

interface PipelineEtapa { id: string; nome: string; cor: string; ordem: number }
interface Match {
  id: string; etapaId: string; etapa: PipelineEtapa; createdAt: string
  imovel: { id: string; titulo: string; preco: number; cidade: { nome: string } }
  perfil: { clienteNome: string }
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

function daysSince(iso: string) {
  return Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24))
}

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

export default function CorretorDashboardPage() {
  const router  = useRouter()
  const [matches, setMatches] = useState<Match[]>([])
  const [etapas,  setEtapas]  = useState<PipelineEtapa[]>([])
  const [loading, setLoading] = useState(true)

  // Lê o usuário apenas no cliente
  const [userName, setUserName] = useState('')

  useEffect(() => {
    const user = getCurrentUser()

    // Redireciona ADMIN para o dashboard deles
    if (user?.role === 'ADMIN') { router.replace('/dashboard'); return }

    setUserName(user?.name?.split(' ')[0] ?? 'Corretor')

    const loadAll = async () => {
      const [ma, et] = await Promise.allSettled([
        api.get<Match[]>('/matches'),
        api.get<PipelineEtapa[]>('/pipeline/etapas'),
      ])
      if (ma.status === 'fulfilled') setMatches(ma.value)
      if (et.status === 'fulfilled') setEtapas(et.value)
      setLoading(false)
    }
    loadAll()
  }, [router])

  // Derivacoes
  const ultimaEtapa  = etapas.length ? etapas[etapas.length - 1] : null
  const convertidos  = ultimaEtapa ? matches.filter((m) => m.etapaId === ultimaEtapa.id).length : 0
  const emNegociacao = matches.filter((m) => m.etapaId !== ultimaEtapa?.id).length
  const taxaConv     = matches.length ? Math.round(convertidos / matches.length * 100) : 0

  // Funil (apenas meus matches)
  const funilData = etapas.map((e) => ({
    name:  e.nome,
    total: matches.filter((m) => m.etapaId === e.id).length,
    color: e.cor,
  }))

  // Matches sem movimentacao: nao convertidos e criados ha mais de 7 dias
  const semMovimentacao = matches
    .filter((m) => m.etapaId !== ultimaEtapa?.id && daysSince(m.createdAt) > 7)
    .sort((a, b) => daysSince(b.createdAt) - daysSince(a.createdAt))
    .slice(0, 6)

  const Skeleton = () => <span className="text-muted-foreground/30">-</span>

  return (
    <div className="space-y-6">

      {/* Cabecalho */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          {loading ? 'Carregando...' : `Ola, ${userName}!`}
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">Seu painel de acompanhamento</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

        {/* Meus Matches */}
        <Card className="rounded-xl shadow-sm border-l-4 border-l-blue-500">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Meus Matches</p>
                <p className="text-3xl font-bold mt-2 tabular-nums">{loading ? <Skeleton /> : matches.length}</p>
                {!loading && <p className="text-xs text-muted-foreground mt-1">total atribuidos a mim</p>}
              </div>
              <div className="p-2.5 rounded-xl bg-blue-50 shrink-0">
                <GitMerge className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Em Negociacao */}
        <Card className="rounded-xl shadow-sm border-l-4 border-l-amber-500">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Em Negociacao</p>
                <p className="text-3xl font-bold mt-2 tabular-nums">{loading ? <Skeleton /> : emNegociacao}</p>
                {!loading && <p className="text-xs text-muted-foreground mt-1">etapas ativas no pipeline</p>}
              </div>
              <div className="p-2.5 rounded-xl bg-amber-50 shrink-0">
                <BarChart3 className="h-5 w-5 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Convertidos */}
        <Card className="rounded-xl shadow-sm border-l-4 border-l-emerald-500">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Convertidos</p>
                <p className="text-3xl font-bold mt-2 tabular-nums">{loading ? <Skeleton /> : convertidos}</p>
                {!loading && <p className="text-xs text-muted-foreground mt-1">fechamentos concluidos</p>}
              </div>
              <div className="p-2.5 rounded-xl bg-emerald-50 shrink-0">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Taxa de Conversao */}
        <Card className="rounded-xl shadow-sm border-l-4 border-l-violet-500">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Conversao</p>
                <p className="text-3xl font-bold mt-2 tabular-nums">{loading ? <Skeleton /> : `${taxaConv}%`}</p>
                {!loading && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {convertidos} de {matches.length} matches
                  </p>
                )}
              </div>
              <div className="p-2.5 rounded-xl bg-violet-50 shrink-0">
                <TrendingUp className="h-5 w-5 text-violet-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Funil do meu pipeline */}
      <Card className="rounded-xl shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Meu pipeline</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {loading || matches.length === 0 ? (
            <div className="flex items-center justify-center h-[240px] text-sm text-muted-foreground">
              {loading ? 'Carregando...' : 'Nenhum match atribuido ainda'}
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
                  {funilData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  <LabelList dataKey="total" content={BarLabel} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Ultimos matches + Atencao */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Meus ultimos matches */}
        <Card className="rounded-xl shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-sm font-semibold">Meus ultimos matches</CardTitle>
            <Link
              href="/dashboard/matches"
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
                <p className="text-sm text-muted-foreground">Nenhum match atribuido a voce ainda.</p>
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
                        {m.etapa?.nome ?? '-'}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Matches sem movimentacao */}
        <Card className="rounded-xl shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-500" />
              Precisam de atencao
            </CardTitle>
            <Link
              href="/dashboard/matches"
              className="flex items-center gap-1 text-xs text-primary font-medium hover:underline"
            >
              Ver matches <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </CardHeader>
          <CardContent className="pt-0">
            {loading ? (
              <p className="text-sm text-muted-foreground py-8 text-center">Carregando...</p>
            ) : semMovimentacao.length === 0 ? (
              <div className="text-center py-10">
                <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-emerald-400" />
                <p className="text-sm text-muted-foreground">
                  {matches.length === 0
                    ? 'Nenhum match atribuido ainda.'
                    : 'Todos os matches estao atualizados!'}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {semMovimentacao.map((m) => {
                  const days = daysSince(m.createdAt)
                  const cor  = m.etapa?.cor ?? '#6B7280'
                  return (
                    <div key={m.id} className="flex items-center justify-between py-2.5 gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{m.imovel.titulo}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {m.perfil.clienteNome} · {m.imovel.cidade.nome}
                        </p>
                      </div>
                      <div className="shrink-0 flex flex-col items-end gap-1">
                        <span
                          className="text-xs font-semibold px-2 py-0.5 rounded-full"
                          style={{ backgroundColor: cor + '20', color: cor, outline: `1px solid ${cor}50` }}
                        >
                          {m.etapa?.nome ?? '-'}
                        </span>
                        <span className="text-[10px] text-amber-600 font-medium">{days}d sem mover</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

      </div>
    </div>
  )
}
