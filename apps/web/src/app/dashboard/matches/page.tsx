'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { GitMerge, Search, X, Home, Users, LayoutList, Columns3 } from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent } from '@/components/ui/card'
import { TablePagination } from '@/components/ui/table-pagination'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectTriggerBadge, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { api } from '@/lib/api'
import { formatCurrency } from '@/lib/utils'

interface Match {
  id: string
  status: string
  createdAt: string
  imovel: {
    id: string
    titulo: string
    preco: number
    cidade: { nome: string }
    bairro: string
    finalidade: string
    tipo: { nome: string }
  }
  perfil: {
    id: string
    clienteNome: string
    clienteEmail: string
    clienteWhatsapp?: string
  }
}

const STATUS_OPTIONS = [
  { value: 'NOTIFICADO',    label: 'Notificado',     color: 'bg-slate-100 text-slate-600 ring-1 ring-slate-200'       },
  { value: 'VISUALIZADO',   label: 'Visualizado',    color: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200'           },
  { value: 'INTERESSADO',   label: 'Interessado',    color: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200'        },
  { value: 'EM_NEGOCIACAO', label: 'Em negociação',  color: 'bg-orange-50 text-orange-700 ring-1 ring-orange-200'     },
  { value: 'FECHADO',       label: 'Fechado ✓',      color: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'  },
  { value: 'DESCARTADO',    label: 'Descartado',     color: 'bg-red-50 text-red-600 ring-1 ring-red-200'              },
]

const KANBAN_COLS = [
  { status: 'NOTIFICADO',    label: 'Notificado',    emoji: '🔔', headerBg: 'bg-slate-500',   border: 'border-l-slate-400'   },
  { status: 'VISUALIZADO',   label: 'Visualizado',   emoji: '👁',  headerBg: 'bg-blue-500',    border: 'border-l-blue-400'    },
  { status: 'INTERESSADO',   label: 'Interessado',   emoji: '⭐',  headerBg: 'bg-amber-500',   border: 'border-l-amber-400'   },
  { status: 'EM_NEGOCIACAO', label: 'Em Negociação', emoji: '🤝',  headerBg: 'bg-orange-500',  border: 'border-l-orange-400'  },
  { status: 'FECHADO',       label: 'Fechado',       emoji: '✅',  headerBg: 'bg-emerald-500', border: 'border-l-emerald-400' },
  { status: 'DESCARTADO',    label: 'Descartado',    emoji: '❌',  headerBg: 'bg-red-500',     border: 'border-l-red-400'     },
]

const FINALIDADE_BADGE: Record<string, string> = {
  VENDA:   'bg-violet-50 text-violet-700 ring-1 ring-violet-200',
  ALUGUEL: 'bg-orange-50 text-orange-700 ring-1 ring-orange-200',
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const h = Math.floor(diff / 3600000)
  if (h < 24) return `há ${h}h`
  const d = Math.floor(h / 24)
  return `há ${d}d`
}

// ─── Kanban View ─────────────────────────────────────────────────────────────
function KanbanView({
  matches,
  onStatusChange,
}: {
  matches: Match[]
  onStatusChange: (id: string, status: string) => void
}) {
  return (
    <div className="flex gap-3 overflow-x-auto pb-4" style={{ minHeight: '60vh' }}>
      {KANBAN_COLS.map((col) => {
        const cards = matches.filter((m) => m.status === col.status)
        return (
          <div
            key={col.status}
            className="flex-none w-56 bg-slate-100 rounded-xl flex flex-col"
          >
            {/* Cabeçalho da coluna */}
            <div className={`${col.headerBg} rounded-t-xl px-3 py-2.5 flex items-center justify-between`}>
              <span className="text-white text-xs font-bold uppercase tracking-wide">
                {col.emoji} {col.label}
              </span>
              <span className="bg-white/30 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                {cards.length}
              </span>
            </div>

            {/* Cards */}
            <div className="flex flex-col gap-2 p-2 overflow-y-auto flex-1">
              {cards.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-6 opacity-60">
                  Nenhum match
                </p>
              )}
              {cards.map((m) => {
                const statusInfo = STATUS_OPTIONS.find((s) => s.value === m.status)
                return (
                  <div
                    key={m.id}
                    className={`bg-white rounded-lg shadow-sm border-l-4 ${col.border} p-3 space-y-2`}
                  >
                    {/* Título do imóvel */}
                    <p className="text-xs font-semibold text-slate-800 leading-tight line-clamp-2">
                      {m.imovel.titulo}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {m.imovel.bairro}, {m.imovel.cidade.nome}
                    </p>

                    {/* Cliente */}
                    <div className="flex items-center gap-1">
                      <Users className="h-3 w-3 text-muted-foreground shrink-0" />
                      <p className="text-[11px] text-slate-600 truncate">{m.perfil.clienteNome}</p>
                    </div>

                    {/* Preço + finalidade */}
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700 tabular-nums">
                        {formatCurrency(m.imovel.preco)}
                      </span>
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${FINALIDADE_BADGE[m.imovel.finalidade] ?? ''}`}>
                        {m.imovel.finalidade === 'VENDA' ? 'Venda' : 'Aluguel'}
                      </span>
                    </div>

                    {/* Tipo + data */}
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">
                        {m.imovel.tipo?.nome ?? '—'}
                      </span>
                      <span className="text-[10px] text-muted-foreground">{timeAgo(m.createdAt)}</span>
                    </div>

                    {/* Alterar status */}
                    <Select value={m.status} onValueChange={(v) => onStatusChange(m.id, v)}>
                      <SelectTriggerBadge title="Alterar status">
                        <span className={`w-full inline-flex items-center justify-between gap-1 px-2 py-1 rounded text-[10px] font-semibold cursor-pointer ${statusInfo?.color ?? ''}`}>
                          Mover para...
                          <svg className="h-2.5 w-2.5 opacity-60" viewBox="0 0 10 10" fill="currentColor">
                            <path d="M5 7L1 3h8L5 7z"/>
                          </svg>
                        </span>
                      </SelectTriggerBadge>
                      <SelectContent>
                        {STATUS_OPTIONS.filter((s) => s.value !== m.status).map((s) => (
                          <SelectItem key={s.value} value={s.value} className="text-xs">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${s.color}`}>
                              {s.label}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Main Content ─────────────────────────────────────────────────────────────
function MatchesContent() {
  const searchParams = useSearchParams()
  const router       = useRouter()

  const urlImovelId = searchParams.get('imovelId') ?? ''
  const urlPerfilId = searchParams.get('perfilId') ?? ''
  const urlLabel    = searchParams.get('label') ?? ''

  const [matches, setMatches]   = useState<Match[]>([])
  const [loading, setLoading]   = useState(true)
  const [viewMode, setViewMode] = useState<'table' | 'kanban'>('table')

  const [filtroTexto,      setFiltroTexto]      = useState('')
  const [filtroStatus,     setFiltroStatus]     = useState('__todos__')
  const [filtroFinalidade, setFiltroFinalidade] = useState('__todas__')
  const [page, setPage]         = useState(1)
  const [pageSize, setPageSize] = useState(10)

  useEffect(() => {
    api.get<Match[]>('/matches')
      .then(setMatches)
      .finally(() => setLoading(false))
  }, [])

  async function handleStatusChange(matchId: string, status: string) {
    try {
      await api.patch(`/matches/${matchId}/status`, { status })
      setMatches((prev) => prev.map((m) => m.id === matchId ? { ...m, status } : m))
      toast.success('Status atualizado')
    } catch {
      toast.error('Erro ao atualizar status')
    }
  }

  const matchesFiltrados = matches.filter((m) => {
    if (urlImovelId && m.imovel.id !== urlImovelId) return false
    if (urlPerfilId && m.perfil.id !== urlPerfilId) return false
    const texto = filtroTexto.toLowerCase()
    if (texto &&
      !m.imovel.titulo.toLowerCase().includes(texto) &&
      !m.perfil.clienteNome.toLowerCase().includes(texto) &&
      !m.imovel.cidade.nome.toLowerCase().includes(texto) &&
      !m.perfil.clienteEmail.toLowerCase().includes(texto)) return false
    if (filtroStatus     !== '__todos__' && m.status            !== filtroStatus)     return false
    if (filtroFinalidade !== '__todas__' && m.imovel.finalidade !== filtroFinalidade) return false
    return true
  })

  const filtrosAtivos = filtroTexto || filtroStatus !== '__todos__' || filtroFinalidade !== '__todas__'

  function limparFiltros() {
    setFiltroTexto(''); setFiltroStatus('__todos__'); setFiltroFinalidade('__todas__'); setPage(1)
  }

  const handleFiltroTexto      = (v: string) => { setFiltroTexto(v);      setPage(1) }
  const handleFiltroStatus     = (v: string) => { setFiltroStatus(v);     setPage(1) }
  const handleFiltroFinalidade = (v: string) => { setFiltroFinalidade(v); setPage(1) }

  const matchesPaginados = matchesFiltrados.slice((page - 1) * pageSize, page * pageSize)

  return (
    <div className="space-y-4">

      {/* ── Cabeçalho ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Matches</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {loading
              ? 'Carregando...'
              : `${matchesFiltrados.length} de ${matches.length} match(es)`}
          </p>
        </div>

        {/* Toggle de view */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
          <button
            onClick={() => setViewMode('table')}
            title="Visualização em tabela"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              viewMode === 'table'
                ? 'bg-white text-slate-800 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <LayoutList className="h-3.5 w-3.5" />
            Tabela
          </button>
          <button
            onClick={() => setViewMode('kanban')}
            title="Visualização Kanban"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              viewMode === 'kanban'
                ? 'bg-white text-slate-800 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Columns3 className="h-3.5 w-3.5" />
            Kanban
          </button>
        </div>
      </div>

      {/* ── Banner de contexto ── */}
      {(urlImovelId || urlPerfilId) && urlLabel && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 text-sm font-medium">
          {urlImovelId ? <Home className="h-4 w-4 shrink-0" /> : <Users className="h-4 w-4 shrink-0" />}
          <span className="flex-1">
            {urlImovelId ? 'Imóvel: ' : 'Cliente: '}
            <span className="font-semibold">{urlLabel}</span>
          </span>
          <button
            onClick={() => router.replace('/dashboard/matches')}
            className="ml-auto p-0.5 rounded hover:bg-blue-100 transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* ── Filtros ── */}
      <Card className="shadow-sm rounded-xl">
        <CardContent className="pt-4 pb-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
            <div className="lg:col-span-2 space-y-1">
              <Label className="text-xs">Buscar</Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-8"
                  placeholder="Imóvel, cliente ou cidade..."
                  value={filtroTexto}
                  onChange={(e) => handleFiltroTexto(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Finalidade</Label>
              <Select value={filtroFinalidade} onValueChange={handleFiltroFinalidade}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__todas__">Todas</SelectItem>
                  <SelectItem value="VENDA">Venda</SelectItem>
                  <SelectItem value="ALUGUEL">Aluguel</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Status</Label>
              <Select value={filtroStatus} onValueChange={handleFiltroStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__todos__">Todos</SelectItem>
                  {STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {filtrosAtivos && (
            <button
              onClick={limparFiltros}
              className="mt-2 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <X className="h-3 w-3" /> Limpar filtros
            </button>
          )}
        </CardContent>
      </Card>

      {/* ── VIEW: TABELA ── */}
      {viewMode === 'table' && (
        <Card className="shadow-sm rounded-xl overflow-hidden">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Imóvel</TableHead>
                  <TableHead>Tipo / Finalidade</TableHead>
                  <TableHead className="text-right">Preço</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Contato</TableHead>
                  <TableHead className="text-center">Data</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                      Carregando...
                    </TableCell>
                  </TableRow>
                ) : matchesFiltrados.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-16 text-center">
                      <GitMerge className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
                      <p className="text-sm text-muted-foreground">
                        {filtrosAtivos
                          ? 'Nenhum match com esses filtros.'
                          : 'Nenhum match ainda. Cadastre imóveis para o motor rodar.'}
                      </p>
                    </TableCell>
                  </TableRow>
                ) : (
                  matchesPaginados.map((match) => {
                    const statusInfo = STATUS_OPTIONS.find((s) => s.value === match.status)
                    return (
                      <TableRow key={match.id}>
                        <TableCell className="max-w-[180px]">
                          <p className="font-medium text-sm truncate" title={match.imovel.titulo}>
                            {match.imovel.titulo}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {match.imovel.bairro}, {match.imovel.cidade.nome}
                          </p>
                        </TableCell>

                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <span className="text-xs text-muted-foreground">
                              {match.imovel.tipo?.nome ?? '—'}
                            </span>
                            <span className={`inline-flex w-fit items-center text-xs font-semibold px-2 py-0.5 rounded-full ${FINALIDADE_BADGE[match.imovel.finalidade] ?? ''}`}>
                              {match.imovel.finalidade === 'VENDA' ? 'Venda' : 'Aluguel'}
                            </span>
                          </div>
                        </TableCell>

                        <TableCell className="text-right font-semibold text-sm tabular-nums">
                          {formatCurrency(match.imovel.preco)}
                        </TableCell>

                        <TableCell>
                          <p className="text-sm font-medium">{match.perfil.clienteNome}</p>
                        </TableCell>

                        <TableCell>
                          <p className="text-xs text-muted-foreground">{match.perfil.clienteEmail}</p>
                          {match.perfil.clienteWhatsapp && (
                            <p className="text-xs text-muted-foreground">{match.perfil.clienteWhatsapp}</p>
                          )}
                        </TableCell>

                        <TableCell className="text-center text-xs text-muted-foreground tabular-nums">
                          {formatDate(match.createdAt)}
                        </TableCell>

                        <TableCell>
                          <Select value={match.status} onValueChange={(v) => handleStatusChange(match.id, v)}>
                            <SelectTriggerBadge title="Clique para alterar o status">
                              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold cursor-pointer transition-opacity hover:opacity-75 ${statusInfo?.color ?? 'bg-slate-100 text-slate-600'}`}>
                                {statusInfo?.label ?? match.status}
                                <svg className="h-2.5 w-2.5 opacity-60" viewBox="0 0 10 10" fill="currentColor">
                                  <path d="M5 7L1 3h8L5 7z"/>
                                </svg>
                              </span>
                            </SelectTriggerBadge>
                            <SelectContent>
                              {STATUS_OPTIONS.map((s) => (
                                <SelectItem key={s.value} value={s.value} className="text-xs">
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${s.color}`}>
                                    {s.label}
                                  </span>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
            <TablePagination
              total={matchesFiltrados.length}
              page={page}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={(s) => { setPageSize(s); setPage(1) }}
            />
          </CardContent>
        </Card>
      )}

      {/* ── VIEW: KANBAN ── */}
      {viewMode === 'kanban' && (
        loading ? (
          <p className="text-sm text-muted-foreground py-10 text-center">Carregando...</p>
        ) : (
          <KanbanView matches={matchesFiltrados} onStatusChange={handleStatusChange} />
        )
      )}
    </div>
  )
}

export default function MatchesPage() {
  return (
    <Suspense fallback={<div className="p-8 text-slate-500">Carregando matches...</div>}>
      <MatchesContent />
    </Suspense>
  )
}
