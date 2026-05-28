'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { GitMerge, Search, X, Home, Users, LayoutList, Columns3 } from 'lucide-react'
import { toast } from 'sonner'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
  DragStartEvent,
  DragEndEvent,
} from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { Card, CardContent } from '@/components/ui/card'
import { TablePagination } from '@/components/ui/table-pagination'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectTriggerBadge, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { api } from '@/lib/api'
import { formatCurrency } from '@/lib/utils'

interface PipelineEtapa {
  id: string
  nome: string
  cor: string
  ordem: number
  ativo: boolean
}

interface Match {
  id: string
  etapaId: string
  etapa: PipelineEtapa
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

/** Retorna branco ou escuro dependendo do fundo hex */
function textColorForBg(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return lum > 0.55 ? '#1e293b' : '#ffffff'
}

// ─── Card de Match ─────────────────────────────────────────────────────────────
function MatchCard({ match, isDragging = false }: { match: Match; isDragging?: boolean }) {
  const cor = match.etapa?.cor ?? '#6B7280'
  return (
    <div
      className={`bg-white rounded-lg shadow-sm border-l-[3px] p-2 space-y-1.5 ${isDragging ? 'opacity-50' : ''}`}
      style={{ borderLeftColor: cor }}
    >
      <p className="text-[11px] font-semibold text-slate-800 leading-tight line-clamp-2">
        {match.imovel.titulo}
      </p>
      <p className="text-[10px] text-muted-foreground leading-tight">
        {match.imovel.bairro}, {match.imovel.cidade.nome}
      </p>
      <div className="flex items-center gap-1">
        <Users className="h-2.5 w-2.5 text-muted-foreground shrink-0" />
        <p className="text-[10px] text-slate-600 truncate">{match.perfil.clienteNome}</p>
      </div>
      <div className="flex items-center justify-between gap-1">
        <span className="text-[10px] font-bold text-slate-700 tabular-nums truncate">
          {formatCurrency(match.imovel.preco)}
        </span>
        <span className={`text-[9px] font-semibold px-1 py-0.5 rounded-full shrink-0 ${FINALIDADE_BADGE[match.imovel.finalidade] ?? ''}`}>
          {match.imovel.finalidade === 'VENDA' ? 'Venda' : 'Alug.'}
        </span>
      </div>
      <div className="flex items-center justify-between gap-1">
        <span className="text-[9px] bg-slate-100 text-slate-500 px-1 py-0.5 rounded truncate">
          {match.imovel.tipo?.nome ?? '—'}
        </span>
        <span className="text-[9px] text-muted-foreground shrink-0">{timeAgo(match.createdAt)}</span>
      </div>
    </div>
  )
}

// ─── Card arrastável ──────────────────────────────────────────────────────────
function DraggableCard({ match }: { match: Match }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: match.id,
    data: { etapaId: match.etapaId },
  })

  const style = {
    transform: CSS.Translate.toString(transform),
    cursor: isDragging ? 'grabbing' : 'grab',
    zIndex: isDragging ? 50 : undefined,
    opacity: isDragging ? 0.4 : 1,
  }

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
      <MatchCard match={match} />
    </div>
  )
}

// ─── Coluna Droppable ─────────────────────────────────────────────────────────
function DroppableColumn({ etapa, matches }: { etapa: PipelineEtapa; matches: Match[] }) {
  const { setNodeRef, isOver } = useDroppable({ id: etapa.id })
  const textColor = textColorForBg(etapa.cor)

  return (
    <div className="flex-1 min-w-0 bg-slate-100 rounded-xl flex flex-col">
      <div
        className="rounded-t-xl px-2 py-2 flex items-center justify-between gap-1"
        style={{ backgroundColor: etapa.cor }}
      >
        <span
          className="text-[11px] font-bold uppercase tracking-wide truncate leading-tight"
          style={{ color: textColor }}
        >
          {etapa.nome}
        </span>
        <span
          className="text-[11px] font-bold px-1.5 py-0.5 rounded-full shrink-0"
          style={{ backgroundColor: 'rgba(255,255,255,0.25)', color: textColor }}
        >
          {matches.length}
        </span>
      </div>

      <div
        ref={setNodeRef}
        className={`flex flex-col gap-1.5 p-1.5 overflow-y-auto flex-1 min-h-[120px] rounded-b-xl transition-colors ${
          isOver ? 'bg-blue-50 ring-2 ring-blue-300 ring-inset' : ''
        }`}
      >
        {matches.length === 0 && !isOver && (
          <p className="text-[11px] text-muted-foreground text-center py-6 opacity-50">Solte aqui</p>
        )}
        {matches.map((m) => (
          <DraggableCard key={m.id} match={m} />
        ))}
      </div>
    </div>
  )
}

// ─── Kanban View ──────────────────────────────────────────────────────────────
function KanbanView({
  matches,
  etapas,
  onEtapaChange,
}: {
  matches: Match[]
  etapas: PipelineEtapa[]
  onEtapaChange: (matchId: string, etapaId: string) => void
}) {
  const [activeMatch, setActiveMatch] = useState<Match | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  )

  function handleDragStart(event: DragStartEvent) {
    const match = matches.find((m) => m.id === event.active.id)
    setActiveMatch(match ?? null)
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveMatch(null)
    const { active, over } = event
    if (!over) return
    const newEtapaId = over.id as string
    const match = matches.find((m) => m.id === active.id)
    if (match && match.etapaId !== newEtapaId) {
      onEtapaChange(match.id, newEtapaId)
    }
  }

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex gap-2 w-full" style={{ minHeight: '60vh' }}>
        {etapas.map((etapa) => (
          <DroppableColumn
            key={etapa.id}
            etapa={etapa}
            matches={matches.filter((m) => m.etapaId === etapa.id)}
          />
        ))}
      </div>

      <DragOverlay>
        {activeMatch && (
          <div className="rotate-1 shadow-xl scale-105 transition-transform">
            <MatchCard match={activeMatch} />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  )
}

// ─── Main Content ─────────────────────────────────────────────────────────────
function MatchesContent() {
  const searchParams = useSearchParams()
  const router       = useRouter()

  const urlImovelId = searchParams.get('imovelId') ?? ''
  const urlPerfilId = searchParams.get('perfilId') ?? ''
  const urlLabel    = searchParams.get('label') ?? ''

  const [matches,  setMatches]  = useState<Match[]>([])
  const [etapas,   setEtapas]   = useState<PipelineEtapa[]>([])
  const [loading,  setLoading]  = useState(true)
  const [viewMode, setViewMode] = useState<'table' | 'kanban'>('table')

  const [filtroTexto,      setFiltroTexto]      = useState('')
  const [filtroEtapa,      setFiltroEtapa]      = useState('__todos__')
  const [filtroFinalidade, setFiltroFinalidade] = useState('__todas__')
  const [page,     setPage]     = useState(1)
  const [pageSize, setPageSize] = useState(10)

  useEffect(() => {
    Promise.all([
      api.get<Match[]>('/matches'),
      api.get<PipelineEtapa[]>('/pipeline/etapas'),
    ])
      .then(([m, e]) => { setMatches(m); setEtapas(e) })
      .finally(() => setLoading(false))
  }, [])

  async function handleEtapaChange(matchId: string, etapaId: string) {
    const oldMatch = matches.find((m) => m.id === matchId)
    if (!oldMatch) return
    const etapa = etapas.find((e) => e.id === etapaId)
    if (!etapa) return

    // Optimistic update
    setMatches((prev) => prev.map((m) => m.id === matchId ? { ...m, etapaId, etapa } : m))
    try {
      await api.patch(`/matches/${matchId}/etapa`, { etapaId })
      toast.success('Etapa atualizada')
    } catch {
      // Reverte com valores originais
      setMatches((prev) =>
        prev.map((m) => m.id === matchId ? { ...m, etapaId: oldMatch.etapaId, etapa: oldMatch.etapa } : m),
      )
      toast.error('Erro ao atualizar etapa')
    }
  }

  const matchesFiltrados = matches.filter((m) => {
    if (urlImovelId && m.imovel.id !== urlImovelId) return false
    if (urlPerfilId && m.perfil.id !== urlPerfilId) return false
    const texto = filtroTexto.toLowerCase()
    if (
      texto &&
      !m.imovel.titulo.toLowerCase().includes(texto) &&
      !m.perfil.clienteNome.toLowerCase().includes(texto) &&
      !m.imovel.cidade.nome.toLowerCase().includes(texto) &&
      !m.perfil.clienteEmail.toLowerCase().includes(texto)
    ) return false
    if (filtroEtapa      !== '__todos__' && m.etapaId             !== filtroEtapa)      return false
    if (filtroFinalidade !== '__todas__' && m.imovel.finalidade    !== filtroFinalidade) return false
    return true
  })

  const filtrosAtivos = filtroTexto || filtroEtapa !== '__todos__' || filtroFinalidade !== '__todas__'

  function limparFiltros() {
    setFiltroTexto(''); setFiltroEtapa('__todos__'); setFiltroFinalidade('__todas__'); setPage(1)
  }

  const matchesPaginados = matchesFiltrados.slice((page - 1) * pageSize, page * pageSize)

  return (
    <div className="space-y-4">

      {/* ── Cabeçalho ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Matches</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {loading ? 'Carregando...' : `${matchesFiltrados.length} de ${matches.length} match(es)`}
          </p>
        </div>

        {/* Toggle de view */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
          <button
            onClick={() => setViewMode('table')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              viewMode === 'table' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <LayoutList className="h-3.5 w-3.5" /> Tabela
          </button>
          <button
            onClick={() => setViewMode('kanban')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              viewMode === 'kanban' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Columns3 className="h-3.5 w-3.5" /> Kanban
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
          <button onClick={() => router.replace('/dashboard/matches')} className="ml-auto p-0.5 rounded hover:bg-blue-100">
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
                  onChange={(e) => { setFiltroTexto(e.target.value); setPage(1) }}
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Finalidade</Label>
              <Select value={filtroFinalidade} onValueChange={(v) => { setFiltroFinalidade(v); setPage(1) }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__todas__">Todas</SelectItem>
                  <SelectItem value="VENDA">Venda</SelectItem>
                  <SelectItem value="ALUGUEL">Aluguel</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Etapa</Label>
              <Select value={filtroEtapa} onValueChange={(v) => { setFiltroEtapa(v); setPage(1) }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__todos__">Todas</SelectItem>
                  {etapas.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      <span className="flex items-center gap-1.5">
                        <span
                          className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: e.cor }}
                        />
                        {e.nome}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {filtrosAtivos && (
            <button onClick={limparFiltros} className="mt-2 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
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
                  <TableHead>Etapa</TableHead>
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
                  matchesPaginados.map((match) => (
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
                          <span className="text-xs text-muted-foreground">{match.imovel.tipo?.nome ?? '—'}</span>
                          <span
                            className={`inline-flex w-fit items-center text-xs font-semibold px-2 py-0.5 rounded-full ${
                              FINALIDADE_BADGE[match.imovel.finalidade] ?? ''
                            }`}
                          >
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
                        <Select value={match.etapaId} onValueChange={(v) => handleEtapaChange(match.id, v)}>
                          <SelectTriggerBadge title="Clique para alterar a etapa">
                            <span
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold cursor-pointer hover:opacity-75 transition-opacity"
                              style={{
                                backgroundColor: (match.etapa?.cor ?? '#6B7280') + '20',
                                color: match.etapa?.cor ?? '#6B7280',
                                outline: `1px solid ${(match.etapa?.cor ?? '#6B7280')}50`,
                              }}
                            >
                              {match.etapa?.nome ?? '—'}
                              <svg className="h-2.5 w-2.5 opacity-60" viewBox="0 0 10 10" fill="currentColor">
                                <path d="M5 7L1 3h8L5 7z" />
                              </svg>
                            </span>
                          </SelectTriggerBadge>
                          <SelectContent>
                            {etapas.map((e) => (
                              <SelectItem key={e.id} value={e.id} className="text-xs">
                                <span className="flex items-center gap-1.5">
                                  <span
                                    className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
                                    style={{ backgroundColor: e.cor }}
                                  />
                                  {e.nome}
                                </span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  ))
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
        loading
          ? <p className="text-sm text-muted-foreground py-10 text-center">Carregando...</p>
          : (
            <KanbanView
              matches={matchesFiltrados}
              etapas={etapas}
              onEtapaChange={handleEtapaChange}
            />
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
