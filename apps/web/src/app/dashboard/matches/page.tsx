'use client'
import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import {
  GitMerge, Search, X, Home, Users, LayoutList, Columns3,
  MessageCircle, Clock, Link2, ArrowRight, UserCheck, UserMinus,
  SlidersHorizontal, ChevronDown, ChevronUp,
} from 'lucide-react'
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
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { TablePagination } from '@/components/ui/table-pagination'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectTriggerBadge, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { api } from '@/lib/api'
import { formatCurrency, formatWhatsappLink } from '@/lib/utils'
import { getCurrentUser } from '@/lib/auth'
import { LeadScore } from '@/components/ui/lead-score'
import { AgendarVisitaModal, VisitaRapidaData } from '@/components/ui/agendar-visita-modal'
import { FecharVendaModal, FecharVendaData } from '@/components/ui/fechar-venda-modal'

interface PipelineEtapa {
  id: string
  nome: string
  cor: string
  ordem: number
  ativo: boolean
}

interface Corretor {
  id: string
  name: string
  email: string
}

interface Match {
  id: string
  etapaId: string
  etapa: PipelineEtapa
  corretorId: string | null
  corretor: Corretor | null
  leadScore: number
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
    cliente: {
      id: string
      nome: string
      email: string
      whatsapp?: string
    }
  }
}

interface MatchHistoricoItem {
  id: string
  tipo: 'MATCH_CRIADO' | 'ETAPA_ALTERADA' | 'CORRETOR_ATRIBUIDO' | 'CORRETOR_REMOVIDO'
  etapaOrigem:  { id: string; nome: string; cor: string } | null
  etapaDestino: { id: string; nome: string; cor: string } | null
  usuario: { id: string; name: string } | null
  createdAt: string
}

const FINALIDADE_BADGE: Record<string, string> = {
  VENDA:   'bg-violet-50 text-violet-700 ring-1 ring-violet-200',
  ALUGUEL: 'bg-orange-50 text-orange-700 ring-1 ring-orange-200',
}

const HISTORICO_CONFIG: Record<MatchHistoricoItem['tipo'], {
  icon: React.ElementType
  color: string
  bg: string
  label: string
}> = {
  MATCH_CRIADO:       { icon: Link2,      color: 'text-emerald-600', bg: 'bg-emerald-50', label: 'Match criado'      },
  ETAPA_ALTERADA:     { icon: ArrowRight, color: 'text-blue-600',    bg: 'bg-blue-50',    label: 'Etapa alterada'    },
  CORRETOR_ATRIBUIDO: { icon: UserCheck,  color: 'text-violet-600',  bg: 'bg-violet-50',  label: 'Corretor atribuido' },
  CORRETOR_REMOVIDO:  { icon: UserMinus,  color: 'text-red-600',     bg: 'bg-red-50',     label: 'Corretor removido' },
}


function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

function formatFull(iso: string) {
  const d = new Date(iso)
  return (
    d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' }) +
    ' ' +
    d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  )
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const h = Math.floor(diff / 3600000)
  if (h < 24) return `ha ${h}h`
  const d = Math.floor(h / 24)
  return `ha ${d}d`
}

/** Retorna branco ou escuro dependendo do fundo hex */
function textColorForBg(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return lum > 0.55 ? '#1e293b' : '#ffffff'
}

// ─── Modal de Histórico ───────────────────────────────────────────────────────
function HistoricoModal({ matchId, onClose }: { matchId: string; onClose: () => void }) {
  const [historico, setHistorico] = useState<MatchHistoricoItem[]>([])
  const [loading, setLoading]     = useState(true)

  useEffect(() => {
    api.get<MatchHistoricoItem[]>(`/matches/${matchId}/historico`)
      .then(setHistorico)
      .catch(() => toast.error('Erro ao carregar historico'))
      .finally(() => setLoading(false))
  }, [matchId])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-slate-500" />
            <h2 className="text-sm font-semibold text-slate-800">Historico do Match</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-5 py-4">
          {loading ? (
            <p className="text-sm text-muted-foreground text-center py-8">Carregando...</p>
          ) : historico.length === 0 ? (
            <div className="text-center py-8">
              <Clock className="h-8 w-8 mx-auto mb-2 text-slate-200" />
              <p className="text-sm text-muted-foreground">Sem eventos registrados</p>
              <p className="text-xs text-muted-foreground mt-1">
                O historico e gravado a partir da ativacao da funcionalidade.
              </p>
            </div>
          ) : (
            <div className="relative">
              {/* Linha vertical */}
              <div className="absolute left-[13px] top-2 bottom-2 w-px bg-slate-200" />
              <div className="space-y-5">
                {historico.map((item) => {
                  const cfg  = HISTORICO_CONFIG[item.tipo]
                  const Icon = cfg.icon
                  return (
                    <div key={item.id} className="flex gap-3">
                      {/* Ícone */}
                      <div
                        className={`shrink-0 flex items-center justify-center w-7 h-7 rounded-full ${cfg.bg} ${cfg.color} ring-2 ring-white z-10`}
                      >
                        <Icon className="h-3.5 w-3.5" />
                      </div>

                      {/* Conteúdo */}
                      <div className="flex-1 min-w-0 pb-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className={`text-xs font-semibold ${cfg.color}`}>{cfg.label}</p>
                          <p className="text-[10px] text-muted-foreground whitespace-nowrap shrink-0">
                            {formatFull(item.createdAt)}
                          </p>
                        </div>

                        {item.tipo === 'MATCH_CRIADO' && (
                          <div className="mt-0.5 space-y-0.5">
                            <p className="text-xs text-slate-500">Imovel vinculado ao perfil do cliente</p>
                            {item.etapaDestino && (
                              <p className="text-xs text-slate-400">
                                Etapa inicial:{' '}
                                <span
                                  className="font-medium"
                                  style={{ color: item.etapaDestino.cor }}
                                >
                                  {item.etapaDestino.nome}
                                </span>
                              </p>
                            )}
                          </div>
                        )}

                        {item.tipo === 'ETAPA_ALTERADA' && (
                          <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                            {item.etapaOrigem && (
                              <span
                                className="text-[11px] px-2 py-0.5 rounded-full font-medium"
                                style={{
                                  backgroundColor: item.etapaOrigem.cor + '20',
                                  color: item.etapaOrigem.cor,
                                }}
                              >
                                {item.etapaOrigem.nome}
                              </span>
                            )}
                            <ArrowRight className="h-3 w-3 text-slate-400 shrink-0" />
                            {item.etapaDestino && (
                              <span
                                className="text-[11px] px-2 py-0.5 rounded-full font-medium"
                                style={{
                                  backgroundColor: item.etapaDestino.cor + '20',
                                  color: item.etapaDestino.cor,
                                }}
                              >
                                {item.etapaDestino.nome}
                              </span>
                            )}
                            {item.usuario && (
                              <span className="text-[11px] text-slate-400">
                                por {item.usuario.name}
                              </span>
                            )}
                          </div>
                        )}

                        {item.tipo === 'CORRETOR_ATRIBUIDO' && (
                          <p className="mt-0.5 text-xs text-slate-500">
                            {item.usuario
                              ? <>Atribuido a: <span className="font-medium text-slate-700">{item.usuario.name}</span></>
                              : 'Corretor atribuido'}
                          </p>
                        )}

                        {item.tipo === 'CORRETOR_REMOVIDO' && (
                          <p className="mt-0.5 text-xs text-slate-500">
                            {item.usuario
                              ? <>Removido: <span className="font-medium text-slate-700">{item.usuario.name}</span></>
                              : 'Corretor removido'}
                          </p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Card de Match ─────────────────────────────────────────────────────────────
function MatchCard({
  match,
  isDragging = false,
  onShowHistorico,
}: {
  match: Match
  isDragging?: boolean
  onShowHistorico?: () => void
}) {
  const cor = match.etapa?.cor ?? '#6B7280'
  return (
    <div
      className={`bg-white rounded-lg shadow-sm border-l-[3px] p-2.5 space-y-1.5 ${isDragging ? 'opacity-50' : ''}`}
      style={{ borderLeftColor: cor }}
    >
      {/* 1. Nome do cliente + WhatsApp */}
      <div className="flex items-center justify-between gap-1">
        <p className="text-[13px] font-bold text-slate-800 leading-tight truncate">
          {match.perfil.cliente.nome}
        </p>
        {match.perfil.cliente.whatsapp && (
          <a
            href={formatWhatsappLink(
              match.perfil.cliente.whatsapp,
              `Ola ${match.perfil.cliente.nome}! Encontramos um imovel que pode te interessar: ${match.imovel.titulo}. Posso te passar mais detalhes?`,
            )}
            target="_blank"
            rel="noopener noreferrer"
            title={`WhatsApp: ${match.perfil.cliente.whatsapp}`}
            className="shrink-0 flex items-center justify-center h-5 w-5 rounded-full bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
            <MessageCircle className="h-3 w-3" />
          </a>
        )}
      </div>

      {/* 2. Tipo (Venda/Aluguel) + Tipo do imovel */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className={`inline-flex text-[10px] font-semibold px-2 py-0.5 rounded-full ${FINALIDADE_BADGE[match.imovel.finalidade] ?? ''}`}>
          {match.imovel.finalidade === 'VENDA' ? 'Venda' : 'Aluguel'}
        </span>
        <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">
          {match.imovel.tipo?.nome ?? '—'}
        </span>
      </div>

      {/* 3. Descricao do imovel */}
      <p className="text-[11px] text-slate-600 leading-tight line-clamp-2">
        {match.imovel.titulo}
      </p>

      {/* 4. Localizacao */}
      <p className="text-[11px] text-muted-foreground leading-tight">
        {match.imovel.bairro}, {match.imovel.cidade.nome}
      </p>

      <div className="border-t border-slate-100 pt-1.5">
        {/* 5. Valor + botao historico */}
        <div className="flex items-center justify-between gap-1">
          <p className="text-[12px] font-bold text-slate-700 tabular-nums">
            {formatCurrency(match.imovel.preco)}
          </p>
          {onShowHistorico && (
            <button
              className="shrink-0 flex items-center justify-center h-5 w-5 rounded-full bg-slate-50 text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition-colors"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => { e.stopPropagation(); onShowHistorico() }}
              title="Ver historico"
            >
              <Clock className="h-3 w-3" />
            </button>
          )}
        </div>

        {/* 6. Lead Score + Corretor */}
        <div className="flex items-center justify-between mt-0.5">
          <LeadScore score={match.leadScore} size="sm" showBar={false} />
          {match.corretor ? (
            <p className="text-[10px] text-blue-600 font-medium truncate max-w-[80px]">{match.corretor.name}</p>
          ) : (
            <p className="text-[10px] text-slate-300 italic">Sem corretor</p>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Card arrastavel ──────────────────────────────────────────────────────────
function DraggableCard({
  match,
  onShowHistorico,
}: {
  match: Match
  onShowHistorico?: () => void
}) {
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
      <MatchCard match={match} onShowHistorico={onShowHistorico} />
    </div>
  )
}

// ─── Coluna Droppable ─────────────────────────────────────────────────────────
function DroppableColumn({
  etapa,
  matches,
  onShowHistorico,
}: {
  etapa: PipelineEtapa
  matches: Match[]
  onShowHistorico?: (matchId: string) => void
}) {
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
        className="flex flex-col gap-1.5 p-1.5 overflow-y-auto flex-1 min-h-[120px] rounded-b-xl transition-colors"
        style={
          isOver
            ? {
                backgroundColor: etapa.cor + '18',
                boxShadow: `inset 0 0 0 2px ${etapa.cor}`,
              }
            : undefined
        }
      >
        {matches.length === 0 && !isOver && (
          <p className="text-[11px] text-muted-foreground text-center py-6 opacity-50">Solte aqui</p>
        )}
        {matches.map((m) => (
          <DraggableCard
            key={m.id}
            match={m}
            onShowHistorico={onShowHistorico ? () => onShowHistorico(m.id) : undefined}
          />
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
  onShowHistorico,
}: {
  matches: Match[]
  etapas: PipelineEtapa[]
  onEtapaChange: (matchId: string, etapaId: string) => void
  onShowHistorico?: (matchId: string) => void
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
            onShowHistorico={onShowHistorico}
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
  const currentUser  = getCurrentUser()
  const userIsAdmin  = currentUser?.role === 'ADMIN'

  const urlImovelId  = searchParams.get('imovelId') ?? ''
  const urlPerfilId  = searchParams.get('perfilId') ?? ''
  const urlLabel     = searchParams.get('label') ?? ''
  const urlRecentes  = searchParams.get('recentes') ?? ''

  const [matches,    setMatches]    = useState<Match[]>([])
  const [etapas,     setEtapas]     = useState<PipelineEtapa[]>([])
  const [corretores, setCorretores] = useState<Corretor[]>([])
  const [loading,    setLoading]    = useState(true)
  const [viewMode,   setViewMode]   = useState<'table' | 'kanban'>('table')

  const [historicoMatchId, setHistoricoMatchId] = useState<string | null>(null)
  const [visitaRapida,    setVisitaRapida]    = useState<VisitaRapidaData | null>(null)
  const [visitaLoading,   setVisitaLoading]   = useState(false)
  const [fecharVenda,     setFecharVenda]     = useState<FecharVendaData | null>(null)

  const [filtroTexto,      setFiltroTexto]      = useState('')
  const [filtroEtapa,      setFiltroEtapa]      = useState('__todos__')
  const [filtroFinalidade, setFiltroFinalidade] = useState('__todas__')
  const [filtroTipo,       setFiltroTipo]       = useState('__todos__')
  const [filtroCorretor,   setFiltroCorretor]   = useState('__todos__')
  const [filtroData, setFiltroData] = useState<'__todos__' | 'hoje' | '7dias' | '15dias' | '30dias'>(
    urlRecentes === 'hoje' ? 'hoje'
    : urlRecentes === '7'  ? '7dias'
    : urlRecentes === '30' ? '30dias'
    : '15dias'
  )

  // Painel colapsável
  const [painelAberto, setPainelAberto] = useState(false)
  const [staged, setStaged] = useState({
    texto: '', etapa: '__todos__', finalidade: '__todas__', tipo: '__todos__', corretor: '__todos__', data: '15dias' as typeof filtroData,
  })

  function abrirPainel() {
    setStaged({ texto: filtroTexto, etapa: filtroEtapa, finalidade: filtroFinalidade, tipo: filtroTipo, corretor: filtroCorretor, data: filtroData })
    setPainelAberto(true)
  }

  function aplicarFiltros() {
    setFiltroTexto(staged.texto)
    setFiltroEtapa(staged.etapa)
    setFiltroFinalidade(staged.finalidade)
    setFiltroTipo(staged.tipo)
    setFiltroCorretor(staged.corretor)
    setFiltroData(staged.data)
    setPage(1)
    setPainelAberto(false)
  }
  const [page,     setPage]     = useState(1)
  const [pageSize, setPageSize] = useState(10)

  // Converte período UI → ISO para enviar à API
  function periodoToCreatedAfter(periodo: string): string | undefined {
    const now = Date.now()
    if (periodo === 'hoje')   return new Date(new Date().setHours(0, 0, 0, 0)).toISOString()
    if (periodo === '7dias')  return new Date(now - 7  * 86_400_000).toISOString()
    if (periodo === '15dias') return new Date(now - 15 * 86_400_000).toISOString()
    if (periodo === '30dias') return new Date(now - 30 * 86_400_000).toISOString()
    return undefined
  }

  // Carrega etapas e corretores uma única vez
  useEffect(() => {
    const requests: Promise<any>[] = [
      api.get<PipelineEtapa[]>('/pipeline/etapas'),
    ]
    if (userIsAdmin) {
      requests.push(
        api.get<{ id: string; name: string; email: string; role: string }[]>('/users').then(
          (users) => users.filter((u) => u.role === 'CORRETOR'),
        ),
      )
    }
    Promise.allSettled(requests).then(([er, cr]) => {
      if (er.status === 'fulfilled') setEtapas(er.value)
      if (cr && cr.status === 'fulfilled') setCorretores(cr.value)
    })
  }, [userIsAdmin])

  // Re-busca matches no servidor sempre que o período mudar
  useEffect(() => {
    setLoading(true)
    const createdAfter = periodoToCreatedAfter(filtroData)
    const qs = createdAfter ? `?createdAfter=${encodeURIComponent(createdAfter)}` : ''
    api.get<Match[]>(`/matches${qs}`)
      .then(setMatches)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [filtroData])

  async function handleEtapaChange(matchId: string, etapaId: string) {
    const oldMatch = matches.find((m) => m.id === matchId)
    if (!oldMatch) return
    const etapa = etapas.find((e) => e.id === etapaId)
    if (!etapa) return

    // Etapa FECHADO intercepta para mostrar modal de comissão
    const etapasSorted = [...etapas].sort((a, b) => a.ordem - b.ordem)
    const etapaFechado = etapasSorted.find((e: any) => e.tipo === 'FECHADO') ?? etapasSorted.at(-2)
    const isFechado = etapaFechado?.id === etapaId
    if (isFechado && oldMatch.imovel.finalidade === 'VENDA') {
      setFecharVenda({ matchId, etapaId })
      return
    }

    const isVisitaEtapa = (etapa as any).tipo === 'VISITA' || etapa.nome.toLowerCase().includes('visita')

    setMatches((prev) => prev.map((m) => m.id === matchId ? { ...m, etapaId, etapa } : m))

    // Sinaliza imediatamente que a agenda sera aberta
    if (isVisitaEtapa) setVisitaLoading(true)

    try {
      await api.patch(`/matches/${matchId}/etapa`, { etapaId })
      toast.success('Etapa atualizada')

      if (isVisitaEtapa) {
        const match = matches.find(m => m.id === matchId)
        setVisitaLoading(false)
        if (match) {
          setVisitaRapida({
            matchId:         match.id,
            imovelId:        match.imovel.id,
            imovelTitulo:    match.imovel.titulo,
            imovelLocal:     `${match.imovel.bairro}, ${match.imovel.cidade.nome}`,
            clienteId:       match.perfil.cliente.id,
            clienteNome:     match.perfil.cliente.nome,
            clienteEmail:    match.perfil.cliente.email ?? '',
            clienteWhatsapp: match.perfil.cliente.whatsapp ?? '',
            corretorId:      match.corretorId,
          })
        }
      }
    } catch {
      if (isVisitaEtapa) setVisitaLoading(false)
      setMatches((prev) =>
        prev.map((m) => m.id === matchId ? { ...m, etapaId: oldMatch.etapaId, etapa: oldMatch.etapa } : m),
      )
      toast.error('Erro ao atualizar etapa')
    }
  }

  async function handleCorretorChange(matchId: string, corretorId: string) {
    const oldMatch = matches.find((m) => m.id === matchId)
    if (!oldMatch) return
    const value      = corretorId === '__nenhum__' ? null : corretorId
    const corretor   = value ? (corretores.find((c) => c.id === value) ?? null) : null
    setMatches((prev) => prev.map((m) => m.id === matchId ? { ...m, corretorId: value, corretor } : m))
    try {
      await api.patch(`/matches/${matchId}/corretor`, { corretorId: value })
      toast.success(value ? 'Corretor atribuido' : 'Corretor removido')
    } catch {
      setMatches((prev) =>
        prev.map((m) => m.id === matchId ? { ...m, corretorId: oldMatch.corretorId, corretor: oldMatch.corretor } : m),
      )
      toast.error('Erro ao atribuir corretor')
    }
  }

  const matchesFiltrados = matches.filter((m) => {
    if (urlImovelId && m.imovel.id !== urlImovelId) return false
    if (urlPerfilId && m.perfil.id !== urlPerfilId) return false
    const texto = filtroTexto.toLowerCase()
    if (
      texto &&
      !m.imovel.titulo.toLowerCase().includes(texto) &&
      !m.perfil.cliente.nome.toLowerCase().includes(texto) &&
      !m.imovel.cidade.nome.toLowerCase().includes(texto) &&
      !m.perfil.cliente.email.toLowerCase().includes(texto)
    ) return false
    if (filtroEtapa      !== '__todos__'       && m.etapaId               !== filtroEtapa)      return false
    if (filtroFinalidade !== '__todas__'       && m.imovel.finalidade      !== filtroFinalidade) return false
    if (filtroTipo       !== '__todos__'       && m.imovel.tipo?.nome      !== filtroTipo)       return false
    if (filtroCorretor   === '__sem_corretor__' && m.corretorId !== null)                        return false
    if (filtroCorretor !== '__todos__' && filtroCorretor !== '__sem_corretor__' && m.corretorId !== filtroCorretor) return false
    return true
  })

  const tiposDisponiveis = Array.from(
    new Set(matches.map((m) => m.imovel.tipo?.nome).filter((n): n is string => !!n)),
  ).sort()

  const etapaNome = etapas.find((e) => e.id === filtroEtapa)?.nome
  const corretorNome = corretores.find((c) => c.id === filtroCorretor)?.name
  const PERIODO_LABEL: Record<string, string> = { hoje: 'Hoje', '7dias': 'Últimos 7 dias', '15dias': 'Últimos 15 dias', '30dias': 'Últimos 30 dias' }

  const filtrosAtivosArray = [
    filtroTexto                 && { label: `Busca: ${filtroTexto}`,           key: 'texto' },
    filtroEtapa !== '__todos__' && { label: `Etapa: ${etapaNome ?? filtroEtapa}`, key: 'etapa' },
    filtroFinalidade !== '__todas__' && { label: filtroFinalidade === 'VENDA' ? 'Venda' : 'Aluguel', key: 'finalidade' },
    filtroTipo !== '__todos__'  && { label: `Tipo: ${filtroTipo}`,             key: 'tipo' },
    filtroCorretor === '__sem_corretor__' && { label: 'Sem corretor',          key: 'corretor' },
    filtroCorretor !== '__todos__' && filtroCorretor !== '__sem_corretor__' && { label: `Corretor: ${corretorNome ?? ''}`, key: 'corretor' },
    filtroData !== '15dias'     && { label: PERIODO_LABEL[filtroData] ?? filtroData, key: 'data' },
  ].filter(Boolean) as { label: string; key: string }[]

  const filtrosAtivos = filtrosAtivosArray.length > 0

  function removerFiltro(key: string) {
    if (key === 'texto')      setFiltroTexto('')
    if (key === 'etapa')      setFiltroEtapa('__todos__')
    if (key === 'finalidade') setFiltroFinalidade('__todas__')
    if (key === 'tipo')       setFiltroTipo('__todos__')
    if (key === 'corretor')   setFiltroCorretor('__todos__')
    if (key === 'data')       { setFiltroData('15dias'); router.replace('/dashboard/matches') }
    setPage(1)
  }

  function limparFiltros() {
    setFiltroTexto(''); setFiltroEtapa('__todos__'); setFiltroFinalidade('__todas__'); setFiltroData('15dias'); setFiltroTipo('__todos__'); setFiltroCorretor('__todos__'); setPage(1)
    setStaged({ texto: '', etapa: '__todos__', finalidade: '__todas__', tipo: '__todos__', corretor: '__todos__', data: '15dias' })
    router.replace('/dashboard/matches')
  }

  const matchesPaginados = matchesFiltrados.slice((page - 1) * pageSize, page * pageSize)

  return (
    <div className="space-y-4">

      {/* Modal historico */}
      {historicoMatchId && (
        <HistoricoModal
          matchId={historicoMatchId}
          onClose={() => setHistoricoMatchId(null)}
        />
      )}

      {/* Banner: aguarde enquanto abre o modal de visita */}
      {visitaLoading && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 px-5 py-3.5 bg-slate-900 text-white rounded-2xl shadow-2xl text-sm font-medium pointer-events-none select-none">
          <div className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin shrink-0" />
          Aguarde, abrindo tela para agendar a visita...
        </div>
      )}

      {/* Modal agendamento rapido de visita */}
      {visitaRapida && (
        <AgendarVisitaModal
          data={visitaRapida}
          corretores={corretores}
          isAdmin={userIsAdmin}
          onClose={() => setVisitaRapida(null)}
        />
      )}

      {/* Modal de fechamento de venda */}
      <FecharVendaModal
        data={fecharVenda}
        onConfirm={(matchId, etapaId) => {
          const etapa = etapas.find((e) => e.id === etapaId)
          if (etapa) setMatches((prev) => prev.map((m) => m.id === matchId ? { ...m, etapaId, etapa } : m))
          setFecharVenda(null)
          toast.success('Negociação fechada e comissões registradas.')
        }}
        onCancel={() => setFecharVenda(null)}
      />

      {/* Cabecalho */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Matches</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {loading ? 'Carregando...' : `${matchesFiltrados.length} de ${matches.length} match(es)`}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Botão Filtrar */}
          <Button variant="outline" size="sm" className="gap-2" onClick={painelAberto ? () => setPainelAberto(false) : abrirPainel}>
            <SlidersHorizontal className="h-4 w-4" />
            Filtrar
            {filtrosAtivosArray.length > 0 && (
              <span className="ml-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
                {filtrosAtivosArray.length}
              </span>
            )}
            {painelAberto ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </Button>

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
      </div>

      {/* Banner: vindo de "Ultimos matches" no Dashboard */}
      {urlRecentes && !urlImovelId && !urlPerfilId && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 text-sm font-medium">
          <Search className="h-4 w-4 shrink-0" />
          <span className="flex-1">
            Mostrando matches dos{' '}
            <strong>
              {filtroData === 'hoje' ? 'últimas 24h' : filtroData === '7dias' ? 'últimos 7 dias' : filtroData === '15dias' ? 'últimos 15 dias' : 'últimos 30 dias'}
            </strong>
          </span>
          <button onClick={() => { setFiltroData('__todos__'); router.replace('/dashboard/matches') }} className="ml-auto p-0.5 rounded hover:bg-blue-100">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Banner de contexto */}
      {(urlImovelId || urlPerfilId) && urlLabel && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 text-sm font-medium">
          {urlImovelId ? <Home className="h-4 w-4 shrink-0" /> : <Users className="h-4 w-4 shrink-0" />}
          <span className="flex-1">
            {urlImovelId ? 'Imovel: ' : 'Cliente: '}
            <span className="font-semibold">{urlLabel}</span>
          </span>
          <button onClick={() => router.replace('/dashboard/matches')} className="ml-auto p-0.5 rounded hover:bg-blue-100">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Tags de filtros ativos */}
      {filtrosAtivosArray.length > 0 && !painelAberto && (
        <div className="flex flex-wrap gap-2">
          {filtrosAtivosArray.map((f) => (
            <span key={f.key} className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-xs font-medium">
              {f.label}
              <button onClick={() => removerFiltro(f.key)} className="ml-1 text-muted-foreground hover:text-foreground">
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Painel de filtros colapsável */}
      {painelAberto && (
        <Card className="shadow-sm rounded-xl border-primary/20">
          <CardContent className="pt-4 pb-0">
            <div className={`grid grid-cols-1 sm:grid-cols-2 ${userIsAdmin ? 'lg:grid-cols-3' : 'lg:grid-cols-3'} gap-4`}>
              <div className="space-y-1">
                <Label className="text-xs">Buscar</Label>
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    className="pl-8"
                    placeholder="Imóvel, cliente ou cidade..."
                    value={staged.texto}
                    onChange={(e) => setStaged((p) => ({ ...p, texto: e.target.value }))}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Finalidade</Label>
                <Select value={staged.finalidade} onValueChange={(v) => setStaged((p) => ({ ...p, finalidade: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__todas__">Todas</SelectItem>
                    <SelectItem value="VENDA">Venda</SelectItem>
                    <SelectItem value="ALUGUEL">Aluguel</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Tipo de imóvel</Label>
                <Select value={staged.tipo} onValueChange={(v) => setStaged((p) => ({ ...p, tipo: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__todos__">Todos</SelectItem>
                    {tiposDisponiveis.map((tipo) => (
                      <SelectItem key={tipo} value={tipo}>{tipo}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {userIsAdmin && (
                <div className="space-y-1">
                  <Label className="text-xs">Corretor</Label>
                  <Select value={staged.corretor} onValueChange={(v) => setStaged((p) => ({ ...p, corretor: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__todos__">Todos</SelectItem>
                      <SelectItem value="__sem_corretor__">Sem corretor</SelectItem>
                      {corretores.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-1">
                <Label className="text-xs">Etapa</Label>
                <Select value={staged.etapa} onValueChange={(v) => setStaged((p) => ({ ...p, etapa: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__todos__">Todas</SelectItem>
                    {etapas.map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        <span className="flex items-center gap-1.5">
                          <span className="inline-block w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: e.cor }} />
                          {e.nome}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Período</Label>
                <Select value={staged.data} onValueChange={(v: any) => setStaged((p) => ({ ...p, data: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__todos__">Todos</SelectItem>
                    <SelectItem value="hoje">Hoje</SelectItem>
                    <SelectItem value="7dias">Últimos 7 dias</SelectItem>
                    <SelectItem value="15dias">Últimos 15 dias</SelectItem>
                    <SelectItem value="30dias">Últimos 30 dias</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
          <div className="flex items-center justify-end gap-2 px-5 py-3 mt-4 border-t bg-muted/40">
            <Button variant="outline" size="sm" onClick={limparFiltros}>Limpar filtros</Button>
            <Button variant="outline" size="sm" onClick={() => setPainelAberto(false)}>Cancelar</Button>
            <Button size="sm" onClick={aplicarFiltros} className="px-6">Aplicar filtros</Button>
          </div>
        </Card>
      )}

      {/* VIEW: TABELA */}
      {viewMode === 'table' && (
        <Card className="shadow-sm rounded-xl overflow-hidden">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Imovel</TableHead>
                  <TableHead>Tipo / Finalidade</TableHead>
                  <TableHead className="text-right">Preco</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Contato</TableHead>
                  <TableHead className="text-center">Data</TableHead>
                  <TableHead>Etapa</TableHead>
                  <TableHead>Corretor</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-10 text-muted-foreground">
                      Carregando...
                    </TableCell>
                  </TableRow>
                ) : matchesFiltrados.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="py-16 text-center">
                      <GitMerge className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
                      <p className="text-sm text-muted-foreground">
                        {filtrosAtivos
                          ? 'Nenhum match com esses filtros.'
                          : 'Nenhum match ainda. Cadastre imoveis para o motor rodar.'}
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
                        <p className="text-sm font-medium">{match.perfil.cliente.nome}</p>
                      </TableCell>
                      <TableCell>
                        <p className="text-xs text-muted-foreground">{match.perfil.cliente.email}</p>
                        {match.perfil.cliente.whatsapp && (
                          <a
                            href={formatWhatsappLink(
                              match.perfil.cliente.whatsapp,
                              `Ola ${match.perfil.cliente.nome}! Encontramos um imovel que pode te interessar: ${match.imovel.titulo}. Posso te passar mais detalhes?`,
                            )}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-700 hover:underline mt-0.5"
                            title="Abrir WhatsApp"
                          >
                            <MessageCircle className="h-3 w-3 shrink-0" />
                            {match.perfil.cliente.whatsapp}
                          </a>
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
                      <TableCell>
                        {userIsAdmin ? (
                          <Select
                            value={match.corretorId ?? '__nenhum__'}
                            onValueChange={(v) => handleCorretorChange(match.id, v)}
                          >
                            <SelectTrigger className="h-7 text-xs w-[130px]">
                              <SelectValue placeholder="Sem corretor" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__nenhum__" className="text-xs">— Sem corretor</SelectItem>
                              {corretores.map((c) => (
                                <SelectItem key={c.id} value={c.id} className="text-xs">{c.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            {match.corretor?.name ?? '—'}
                          </span>
                        )}
                      </TableCell>
                      {/* Botao historico */}
                      <TableCell>
                        <button
                          onClick={() => setHistoricoMatchId(match.id)}
                          title="Ver historico"
                          className="flex items-center justify-center h-7 w-7 rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                        >
                          <Clock className="h-3.5 w-3.5" />
                        </button>
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

      {/* VIEW: KANBAN */}
      {viewMode === 'kanban' && (
        loading
          ? <p className="text-sm text-muted-foreground py-10 text-center">Carregando...</p>
          : (
            <KanbanView
              matches={matchesFiltrados}
              etapas={etapas}
              onEtapaChange={handleEtapaChange}
              onShowHistorico={setHistoricoMatchId}
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
