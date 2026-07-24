'use client'
import { useEffect, useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  CalendarDays, ChevronLeft, ChevronRight, ChevronDown,
  GitMerge, CheckCircle2, Clock, Star, ArrowRight, TrendingUp, X, Trash2, DollarSign,
} from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { api } from '@/lib/api'
import { getCurrentUser } from '@/lib/auth'
import { VISITA_TIME_SLOTS, VISITA_DURACAO } from '@/components/ui/agendar-visita-modal'

// ── Types ─────────────────────────────────────────────────────────────────────

interface PipelineEtapa { id: string; nome: string; cor: string; ordem: number }

interface Visita {
  id: string
  imovelId: string
  imovel: { id: string; titulo: string; bairro: string; cidade: { nome: string } }
  clienteId: string
  cliente: { id: string; nome: string; email: string; whatsapp?: string }
  corretorId: string | null
  dataHora: string
  duracaoMin: number
  status: 'AGENDADA' | 'REALIZADA' | 'CANCELADA'
  observacoes: string | null
}

interface Match {
  id: string
  leadScore: number
  etapaId: string
  etapa: PipelineEtapa
  corretorId: string | null
  createdAt: string
  updatedAt: string
  imovel: { id: string; titulo: string; preco: number; bairro: string; cidade: { nome: string } }
  perfil: { id: string; cliente: { id: string; nome: string } }
}

interface DashboardSummary {
  etapas:           PipelineEtapa[]
  porEtapa:         { etapaId: string; count: number }[]
  emNegociacao:     number
  mesFechados:      number
  topOportunidades: Match[]
  precisamAtencao:  Match[]
}

// ── Constants ──────────────────────────────────────────────────────────────────

const HOUR_PX  = 56   // px per hour in agenda grid
const DAY_START = 8   // 08:00
const DAY_END   = 20  // 20:00
const NUM_DAYS  = 6   // Mon–Sat

const DIAS_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const MESES_FULL = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]
const MESES_SHORT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

// ── Helpers ───────────────────────────────────────────────────────────────────

function getMonday(d: Date): Date {
  const dt = new Date(d); dt.setHours(0, 0, 0, 0)
  const day = dt.getDay()
  dt.setDate(dt.getDate() + (day === 0 ? -6 : 1 - day))
  return dt
}

function getWorkDays(monday: Date): Date[] {
  return Array.from({ length: NUM_DAYS }, (_, i) => {
    const d = new Date(monday); d.setDate(d.getDate() + i); return d
  })
}

function isToday(d: Date): boolean {
  const t = new Date()
  return d.getDate() === t.getDate() && d.getMonth() === t.getMonth() && d.getFullYear() === t.getFullYear()
}

// Compara data local de d com data UTC do ISO ("2026-06-01T09:00:00.000Z" → "2026-06-01")
function isSameDay(d: Date, iso: string): boolean {
  const isoDate = iso.substring(0, 10)
  const dDate   = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  return dDate === isoDate
}

// Lê hora UTC diretamente da string — consistente com AgendarVisitaModal que appenda .000Z
function fmtHM(iso: string): string {
  return iso.substring(11, 16)
}

// Minutos a partir de 00:00 UTC, usado para posicionar blocos no grid (evita fuso)
function isoStartMin(iso: string): number {
  return parseInt(iso.substring(11, 13)) * 60 + parseInt(iso.substring(14, 16))
}

function daysSince(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24))
}

function fmtPreco(p: number): string {
  if (p >= 1_000_000) return `R$ ${(p / 1_000_000).toFixed(1).replace('.', ',')}M`
  if (p >= 1_000)     return `R$ ${(p / 1_000).toFixed(0)}k`
  return `R$ ${p}`
}

function durStr(min: number): string {
  if (min < 60) return `${min}min`
  const h = Math.floor(min / 60), m = min % 60
  return m > 0 ? `${h}h${m}min` : `${h}h`
}

function mesParam(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

/** Assigns overlap sub-columns to visits sorted by startMin */
function assignOverlapCols(items: { startMin: number; endMin: number }[]): { col: number; total: number }[] {
  const colEnds: number[] = []
  const cols: number[] = []
  items.forEach(item => {
    let c = colEnds.findIndex(e => e <= item.startMin)
    if (c === -1) { c = colEnds.length; colEnds.push(item.endMin) } else colEnds[c] = item.endMin
    cols.push(c)
  })
  const total = colEnds.length || 1
  return cols.map(c => ({ col: c, total }))
}

// ── Score helpers ─────────────────────────────────────────────────────────────

function scoreLabel(s: number) {
  if (s >= 80) return { label: 'Quente 🔥', stroke: '#10b981', text: 'text-emerald-600' }
  if (s >= 65) return { label: 'Morno',     stroke: '#3b82f6', text: 'text-blue-600'    }
  return             { label: 'Frio',       stroke: '#f59e0b', text: 'text-amber-600'   }
}

function ScoreRing({ score }: { score: number }) {
  const { stroke, text } = scoreLabel(score)
  const dash = Math.round(score * 0.879)
  return (
    <div className="relative w-10 h-10 flex items-center justify-center shrink-0">
      <svg viewBox="0 0 36 36" className="w-10 h-10 -rotate-90">
        <circle cx="18" cy="18" r="14" fill="none" stroke="#e2e8f0" strokeWidth="3.5" />
        <circle cx="18" cy="18" r="14" fill="none" strokeWidth="3.5"
          stroke={stroke} strokeDasharray={`${dash} 100`} strokeLinecap="round" />
      </svg>
      <span className={`absolute text-[9px] font-extrabold ${text}`}>{score}</span>
    </div>
  )
}

// ── Status styles ─────────────────────────────────────────────────────────────

const STATUS_VISIT: Record<Visita['status'], string> = {
  AGENDADA:  'bg-blue-50  text-blue-800  border-l-blue-500',
  REALIZADA: 'bg-emerald-50 text-emerald-800 border-l-emerald-500',
  CANCELADA: 'bg-red-50   text-red-800   border-l-red-500   opacity-60',
}

// ═══════════════════════════════════════════════════════════════════════════════
// PAGE
// ═══════════════════════════════════════════════════════════════════════════════

export default function CorretorDashboardPage() {
  const router = useRouter()

  const [userName,  setUserName]  = useState('')
  const [summary,   setSummary]   = useState<DashboardSummary | null>(null)
  const [visitas,   setVisitas]   = useState<Visita[]>([])
  const [loading,   setLoading]   = useState(true)

  // Agenda state
  const [agendaView,   setAgendaView]   = useState<'dia' | 'semana'>('dia')
  const [weekMonday,   setWeekMonday]   = useState<Date>(() => getMonday(new Date()))

  const loadedMonths  = useRef(new Set<string>())
  const dayScrollRef  = useRef<HTMLDivElement>(null)
  const weekScrollRef = useRef<HTMLDivElement>(null)
  // BUG #8: feedback visual ao navegar para semana com mês ainda não carregado
  const [weekLoading, setWeekLoading] = useState(false)

  // Comissões
  const [comissoesOpen, setComissoesOpen] = useState(false)
  const [comissaoData, setComissaoData] = useState<{
    totalGanho: number; pago: number; pendente: number
    lista: { id: string; imovelTitulo: string; valor: number; percentual: number; status: 'PENDENTE' | 'PAGO'; createdAt: string }[]
  } | null>(null)

  // Modal editar visita
  const [editVisita, setEditVisita] = useState<Visita | null>(null)
  const [editForm,      setEditForm]      = useState({ data: '', hora: '', duracaoMin: 60, status: 'AGENDADA' as Visita['status'], observacoes: '' })
  const [editSaving,    setEditSaving]    = useState(false)
  const [editDeleting,  setEditDeleting]  = useState(false)

  // ── Load initial data ──────────────────────────────────────────────────────
  useEffect(() => {
    const user = getCurrentUser()
    if (user?.role === 'ADMIN') { router.replace('/dashboard'); return }
    setUserName(user?.name?.split(' ')[0] ?? 'Corretor')

    const now = new Date()
    const mes = mesParam(now)
    loadedMonths.current.add(mes)

    // Se a semana atual cruza a virada do mês, pré-carrega o mês adjacente
    const monday = getMonday(now)
    const lastWorkDay = new Date(monday); lastWorkDay.setDate(lastWorkDay.getDate() + NUM_DAYS - 1)
    const mesExtra = lastWorkDay.getMonth() !== now.getMonth() ? mesParam(lastWorkDay) : null
    if (mesExtra) loadedMonths.current.add(mesExtra)

    // PERF: substitui 3-4 requests pesados por 2 requests leves em paralelo.
    // /matches/dashboard-summary entrega KPIs + top matches pré-computados no servidor
    // em vez de retornar todos os matches com joins completos para o cliente processar.
    const requests: Promise<any>[] = [
      api.get<DashboardSummary>('/matches/dashboard-summary'),
      api.get<Visita[]>(`/visitas?mes=${mes}`),
      ...(mesExtra ? [api.get<Visita[]>(`/visitas?mes=${mesExtra}`)] : []),
    ]

    Promise.allSettled(requests).then(([sr, vr, vrExtra]) => {
      if (sr.status === 'fulfilled') setSummary(sr.value)
      const visitasBase  = vr.status === 'fulfilled' ? vr.value : []
      const visitasExtra = vrExtra?.status === 'fulfilled' ? vrExtra.value : []
      const byId = new Map([...visitasBase, ...visitasExtra].map(v => [v.id, v]))
      setVisitas([...byId.values()])
      setLoading(false)
    })

    api.get<{ id: string; valor: number; percentual: number; status: 'PENDENTE' | 'PAGO'; createdAt: string; imovel: { titulo: string } }[]>(
      '/financeiro/comissoes?periodo=mes_atual'
    ).then((lista) => {
      const totalGanho = lista.reduce((s, c) => s + Number(c.valor), 0)
      const pago       = lista.filter(c => c.status === 'PAGO').reduce((s, c) => s + Number(c.valor), 0)
      const pendente   = lista.filter(c => c.status === 'PENDENTE').reduce((s, c) => s + Number(c.valor), 0)
      setComissaoData({
        totalGanho, pago, pendente,
        lista: lista.map(c => ({
          id: c.id, imovelTitulo: c.imovel.titulo,
          valor: Number(c.valor), percentual: Number(c.percentual),
          status: c.status, createdAt: c.createdAt,
        })),
      })
    }).catch(() => {})
  }, [router])

  // ── Load visitas for new months when navigating weeks ─────────────────────
  const ensureMonthLoaded = useCallback(async (d: Date) => {
    const mes = mesParam(d)
    if (loadedMonths.current.has(mes)) return
    loadedMonths.current.add(mes)
    setWeekLoading(true) // BUG #8: mostra spinner enquanto carrega mês novo
    try {
      const data = await api.get<Visita[]>(`/visitas?mes=${mes}`)
      setVisitas(prev => {
        const byId = new Map(prev.map(v => [v.id, v]))
        data.forEach(v => byId.set(v.id, v))
        return [...byId.values()]
      })
    } catch {
      // BUG #8 FIX: exibe toast de erro em vez de sumir silenciosamente —
      // o usuário sabe que a agenda pode estar incompleta e pode tentar novamente.
      toast.error('Erro ao carregar a agenda. Verifique sua conexão e tente novamente.')
      // Reverte o mês do Set para permitir nova tentativa na próxima navegação
      loadedMonths.current.delete(mes)
    } finally {
      setWeekLoading(false)
    }
  }, [])

  // Navegação fora do setter — chamar async dentro de setter React não é confiável
  function prevWeek() {
    const d = new Date(weekMonday); d.setDate(d.getDate() - 7)
    ensureMonthLoaded(d); setWeekMonday(new Date(d))
  }
  function nextWeek() {
    const d = new Date(weekMonday); d.setDate(d.getDate() + 7)
    ensureMonthLoaded(d); setWeekMonday(new Date(d))
  }
  function goThisWeek() {
    const d = getMonday(new Date()); ensureMonthLoaded(d); setWeekMonday(d)
  }

  // ── Derived: pipeline (vem do summary pré-computado no servidor) ──────────
  const etapas         = summary?.etapas         ?? []
  const etapaEncerrada = etapas.find((e: any) => e.tipo === 'ENCERRADO') ?? etapas.at(-1) ?? null
  const etapaFechado   = etapas.find((e: any) => e.tipo === 'FECHADO')   ?? etapas.at(-2) ?? null
  const emNegociacao   = summary?.emNegociacao   ?? 0
  const mesFechados    = summary?.mesFechados    ?? 0
  const topOportunidades = summary?.topOportunidades ?? []
  const precisamAtencao  = summary?.precisamAtencao  ?? []

  const porEtapa = summary?.porEtapa ?? []
  const funil = etapas
    .filter(e => e.id !== etapaEncerrada?.id)
    .map(e => ({
      nome: e.nome,
      cor:  e.cor,
      n:    porEtapa.find(p => p.etapaId === e.id)?.count ?? 0,
    }))
  const funilMax = Math.max(...funil.map(f => f.n), 1)

  // ── Derived: visitas KPIs ─────────────────────────────────────────────────
  const now          = new Date()
  const todayISODate = now.toISOString().substring(0, 10)
  const todayVisitas = visitas.filter(v => v.status === 'AGENDADA' && v.dataHora.startsWith(todayISODate))
  const mesRealizadas = visitas.filter(v => v.status === 'REALIZADA').length
  const mesAgendadas  = visitas.filter(v => v.status === 'AGENDADA').length

  // ── Derived: next visit ────────────────────────────────────────────────────
  const nowISO        = now.toISOString()
  const proximaVisita = visitas
    .filter(v => v.status === 'AGENDADA' && v.dataHora >= nowISO)
    .sort((a, b) => a.dataHora.localeCompare(b.dataHora))[0]

  // ── Derived: agenda ────────────────────────────────────────────────────────
  const weekDays = getWorkDays(weekMonday)
  const weekStart = weekDays[0], weekEnd = weekDays[NUM_DAYS - 1]

  const weekLabel = weekStart.getMonth() === weekEnd.getMonth()
    ? `${weekStart.getDate()} a ${weekEnd.getDate()} de ${MESES_FULL[weekStart.getMonth()]} ${weekStart.getFullYear()}`
    : `${weekStart.getDate()} ${MESES_SHORT[weekStart.getMonth()]} – ${weekEnd.getDate()} ${MESES_SHORT[weekEnd.getMonth()]} ${weekEnd.getFullYear()}`

  const agendaSubtitle = agendaView === 'dia'
    ? `${DIAS_SHORT[now.getDay()]}, ${now.getDate()} de ${MESES_FULL[now.getMonth()]}`
    : weekLabel

  const agendaKpis = agendaView === 'dia'
    ? visitas.filter(v => isToday(new Date(v.dataHora)))
    : visitas.filter(v => weekDays.some(d => isSameDay(d, v.dataHora)))

  // Context line
  const contextParts: string[] = []
  if (todayVisitas.length > 0)      contextParts.push(`${todayVisitas.length} ${todayVisitas.length === 1 ? 'visita' : 'visitas'} hoje`)
  if (precisamAtencao.length > 0)   contextParts.push(`${precisamAtencao.length} ${precisamAtencao.length === 1 ? 'match precisa' : 'matches precisam'} de atenção`)
  if (topOportunidades.length > 0)  contextParts.push(`${topOportunidades.length} ${topOportunidades.length === 1 ? 'oportunidade quente' : 'oportunidades quentes'} sem contato`)

  // Scroll to business hours on mount / view change
  useEffect(() => {
    const scrollTarget = Math.max(0, (Math.min(now.getHours(), DAY_END - 2) - DAY_START - 1) * HOUR_PX)
    if (agendaView === 'dia'    && dayScrollRef.current)  dayScrollRef.current.scrollTop  = scrollTarget
    if (agendaView === 'semana' && weekScrollRef.current) weekScrollRef.current.scrollTop = scrollTarget
  }, [agendaView]) // eslint-disable-line react-hooks/exhaustive-deps

  const HOURS = Array.from({ length: DAY_END - DAY_START }, (_, i) => DAY_START + i)
  const GRID_H = (DAY_END - DAY_START) * HOUR_PX

  // Now-line em UTC — alinha com os blocos de visita que também usam hora UTC
  const nowMin    = now.getUTCHours() * 60 + now.getUTCMinutes()
  const nowLinePx = nowMin >= DAY_START * 60 && nowMin < DAY_END * 60
    ? (nowMin - DAY_START * 60) * (HOUR_PX / 60)
    : null

  // ── Day view items — usa hora UTC da string para posicionamento ───────────
  const dayItems = visitas
    .filter(v => v.dataHora.startsWith(new Date().toISOString().substring(0, 10)))
    .sort((a, b) => a.dataHora.localeCompare(b.dataHora))
    .map(v => {
      const startMin = isoStartMin(v.dataHora)
      return { visit: v, startMin, endMin: startMin + v.duracaoMin }
    })
  const dayOverlaps = assignOverlapCols(dayItems)

  // ── Week view: visits per day ──────────────────────────────────────────────
  function weekDayItems(d: Date) {
    return visitas
      .filter(v => isSameDay(d, v.dataHora))
      .sort((a, b) => a.dataHora.localeCompare(b.dataHora))
      .map(v => {
        const startMin = isoStartMin(v.dataHora)
        return { visit: v, startMin, endMin: startMin + v.duracaoMin }
      })
  }

  // ── Handlers: editar visita ────────────────────────────────────────────────
  function openEditVisita(v: Visita) {
    setEditVisita(v)
    setEditForm({
      data:        v.dataHora.substring(0, 10),
      hora:        v.dataHora.substring(11, 16),
      duracaoMin:  v.duracaoMin,
      status:      v.status,
      observacoes: v.observacoes ?? '',
    })
  }

  async function handleSaveEdit() {
    if (!editVisita) return
    setEditSaving(true)
    try {
      const updated = await api.patch<Visita>(`/visitas/${editVisita.id}`, {
        dataHora:    `${editForm.data}T${editForm.hora}:00.000Z`,
        duracaoMin:  editForm.duracaoMin,
        status:      editForm.status,
        observacoes: editForm.observacoes || null,
      })
      setVisitas(prev => prev.map(v => v.id === updated.id ? updated : v))
      toast.success('Visita atualizada')
      setEditVisita(null)
    } catch {
      toast.error('Erro ao salvar visita')
    } finally {
      setEditSaving(false)
    }
  }

  async function handleDeleteVisita() {
    if (!editVisita) return
    setEditDeleting(true)
    try {
      await api.delete(`/visitas/${editVisita.id}`)
      setVisitas(prev => prev.filter(v => v.id !== editVisita.id))
      toast.success('Visita removida')
      setEditVisita(null)
    } catch {
      toast.error('Erro ao remover visita')
    } finally {
      setEditDeleting(false)
    }
  }

  const Sk = () => <span className="text-muted-foreground/30 text-3xl font-bold">-</span>

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════

  return (
    <div className="space-y-5">

      {/* ── 1. Context bar + KPIs ───────────────────────────────────────────── */}
      <div className="rounded-2xl px-6 py-5 shadow-sm text-white"
           style={{ background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)' }}>
        <div className="flex items-center gap-6 flex-wrap">
          {/* Greeting */}
          <div className="flex-1 min-w-0">
            <p className="text-blue-200 text-xs font-semibold uppercase tracking-wide mb-1">
              {DIAS_SHORT[now.getDay()]}, {now.getDate()} de {MESES_FULL[now.getMonth()]} de {now.getFullYear()}
            </p>
            <h1 className="text-2xl font-bold">
              {loading ? 'Carregando...' : `Olá, ${userName}!`}
            </h1>
            {!loading && (
              <p className="text-blue-100 text-sm mt-1 leading-relaxed">
                {contextParts.length ? contextParts.join(' · ') : 'Tudo em dia — bom trabalho!'}
              </p>
            )}
          </div>

          {/* Divider */}
          <div className="hidden lg:block w-px h-16 bg-white/20 shrink-0" />

          {/* KPI cards inline */}
          <div className="flex items-center gap-3 flex-wrap">
            {[
              { label: 'Visitas Hoje',      value: todayVisitas.length,             sub: 'hoje',           onClick: () => document.getElementById('agenda-section')?.scrollIntoView({ behavior: 'smooth' }) },
              { label: 'Em Negociação',     value: emNegociacao,                    sub: 'matches ativos', onClick: undefined },
              { label: 'Visitas no Mês',    value: mesRealizadas + mesAgendadas,    sub: `${mesRealizadas} real. · ${mesAgendadas} ag.`, onClick: undefined },
              { label: 'Fechamentos',       value: mesFechados,                     sub: MESES_FULL[now.getMonth()], onClick: undefined },
            ].map((kpi) => (
              <button
                key={kpi.label}
                onClick={kpi.onClick}
                disabled={!kpi.onClick}
                className="rounded-xl px-5 py-4 text-left transition-colors disabled:cursor-default min-w-[120px]"
                style={{ background: 'rgba(255,255,255,0.15)' }}
              >
                <p className="text-[11px] font-semibold uppercase tracking-wide text-blue-200 mb-1.5 whitespace-nowrap">{kpi.label}</p>
                <p className="text-3xl font-bold tabular-nums leading-none">{loading ? '—' : kpi.value}</p>
                <p className="text-xs text-blue-200 mt-1 whitespace-nowrap">{kpi.sub}</p>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── 2. Minhas Comissões (collapsible) ───────────────────────────────── */}
      {(() => {
        const fmtR = (n: number) => n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
        return (
          <div className="rounded-xl border border-border overflow-hidden border-l-4 border-l-amber-400">
            <button
              onClick={() => setComissoesOpen(o => !o)}
              className="w-full flex items-center gap-3 px-5 py-3.5 bg-background hover:bg-secondary/40 transition-colors"
            >
              <div className="p-2 rounded-lg bg-amber-50 shrink-0">
                <DollarSign className="h-4 w-4 text-amber-600" />
              </div>
              <span className="text-sm font-semibold flex-1 text-left">Minhas comissões</span>
              {comissaoData ? (
                <div className="flex items-center gap-2 mr-2">
                  <span className="text-sm font-medium text-foreground">
                    R$ {fmtR(comissaoData.totalGanho)}
                  </span>
                  <span className="text-xs text-muted-foreground">· este mês</span>
                  {comissaoData.pendente > 0 && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 font-medium">
                      R$ {fmtR(comissaoData.pendente)} pendente
                    </span>
                  )}
                </div>
              ) : (
                <span className="text-xs text-muted-foreground mr-2">este mês</span>
              )}
              <ChevronDown className={`h-4 w-4 text-muted-foreground shrink-0 transition-transform ${comissoesOpen ? 'rotate-180' : ''}`} />
            </button>

            {comissoesOpen && (
              <div className="px-5 pb-5 pt-2 space-y-4 border-t border-border bg-background">
                {/* Summary numbers */}
                <div className="grid grid-cols-3 gap-3 pt-2">
                  {[
                    { label: 'Total ganho', value: comissaoData?.totalGanho ?? 0, color: 'text-foreground' },
                    { label: 'Pago',        value: comissaoData?.pago      ?? 0, color: 'text-emerald-600' },
                    { label: 'Pendente',    value: comissaoData?.pendente  ?? 0, color: 'text-amber-600'  },
                  ].map((s) => (
                    <div key={s.label} className="bg-secondary/50 rounded-lg p-3 text-center">
                      <p className="text-xs text-muted-foreground mb-1">{s.label}</p>
                      <p className={`text-lg font-semibold ${s.color}`}>R$ {fmtR(s.value)}</p>
                    </div>
                  ))}
                </div>

                {/* Commission list */}
                {!comissaoData || comissaoData.lista.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">Nenhuma comissão este mês.</p>
                ) : (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Últimas comissões</p>
                    {comissaoData.lista.slice(0, 5).map((c) => (
                      <div key={c.id} className="flex items-center justify-between gap-3 py-2 border-b border-border last:border-0">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{c.imovelTitulo}</p>
                          <p className="text-xs text-muted-foreground">{c.percentual}% · {new Date(c.createdAt).toLocaleDateString('pt-BR')}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-semibold">R$ {fmtR(c.valor)}</p>
                          <span className={`text-[11px] px-1.5 py-0.5 rounded font-medium ${
                            c.status === 'PENDENTE'
                              ? 'bg-amber-50 text-amber-700'
                              : 'bg-emerald-50 text-emerald-700'
                          }`}>
                            {c.status === 'PENDENTE' ? 'Pendente' : 'Pago'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })()}

      {/* ── 3. Agenda ────────────────────────────────────────────────────────── */}
      <Card id="agenda-section" className="rounded-2xl shadow-sm overflow-hidden">

        {/* Card header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
              <CalendarDays className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800 leading-none">Agenda</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">{agendaSubtitle}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap justify-end">

            {/* KPI pills */}
            <div className="hidden sm:flex items-center gap-1.5">
              {[
                { n: agendaKpis.filter(v => v.status === 'AGENDADA').length,  color: 'blue',    label: 'ag.' },
                { n: agendaKpis.filter(v => v.status === 'REALIZADA').length, color: 'emerald', label: 'real.' },
                { n: agendaKpis.filter(v => v.status === 'CANCELADA').length, color: 'red',     label: 'canc.' },
              ].filter(p => p.n > 0).map(p => (
                <span key={p.label}
                  className={`flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-semibold
                    bg-${p.color}-50 border border-${p.color}-100 text-${p.color}-700`}>
                  <span className={`w-1.5 h-1.5 rounded-full bg-${p.color}-500`} />
                  {p.n} {p.label}
                </span>
              ))}
            </div>

            {/* View toggle */}
            <div className="flex items-center bg-slate-100 rounded-full p-0.5">
              {(['dia', 'semana'] as const).map(v => (
                <button key={v}
                  onClick={() => setAgendaView(v)}
                  className={`px-3.5 py-1 rounded-full text-xs font-semibold transition-all ${
                    agendaView === v
                      ? 'bg-white text-blue-700 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}>
                  {v === 'dia' ? 'Hoje' : 'Semana'}
                </button>
              ))}
            </div>

            {/* Week nav (only in semana view) */}
            {agendaView === 'semana' && (
              <div className="flex items-center gap-0.5 border border-slate-200 rounded-lg p-0.5">
                <button onClick={prevWeek} className="p-1.5 rounded-md text-slate-400 hover:bg-slate-100 transition-colors">
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
                <button onClick={goThisWeek} className="px-2 py-1 text-[11px] font-semibold text-slate-500 hover:bg-slate-100 rounded-md transition-colors">
                  Hoje
                </button>
                <button onClick={nextWeek} className="p-1.5 rounded-md text-slate-400 hover:bg-slate-100 transition-colors">
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            )}



            {/* Agenda completa */}
            <Link href="/agenda" className="hidden sm:flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-700 hover:underline whitespace-nowrap">
              Agenda completa
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>

        {/* ── View: Hoje ──────────────────────────────────────────────────────── */}
        {agendaView === 'dia' && (
          <>
            {loading ? (
              <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">Carregando...</div>
            ) : dayItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 gap-2 text-muted-foreground">
                <CalendarDays className="h-8 w-8 text-slate-200" />
                <p className="text-sm">Nenhuma visita hoje</p>
                <Link href="/agenda" className="text-xs text-blue-600 font-semibold hover:underline">
                  + Agendar visita
                </Link>
              </div>
            ) : (
              <div ref={dayScrollRef} className="overflow-y-auto" style={{ maxHeight: 300 }}>
                <div className="flex" style={{ height: GRID_H }}>

                  {/* Hour labels */}
                  <div className="w-12 shrink-0 border-r border-slate-100 relative">
                    {HOURS.map((h, i) => (
                      <div key={h} className="absolute left-0 right-0 border-b border-slate-50"
                           style={{ top: i * HOUR_PX, height: HOUR_PX }}>
                        <span className="absolute right-1.5 -top-[9px] text-[10px] font-semibold text-slate-400">
                          {h.toString().padStart(2, '0')}h
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Visit column */}
                  <div className="flex-1 relative bg-white">
                    {/* Guide lines */}
                    {HOURS.map((_, i) => (
                      <div key={i} className="absolute left-0 right-0 border-b border-slate-50"
                           style={{ top: i * HOUR_PX }} />
                    ))}

                    {/* Visit blocks */}
                    {dayItems.map((item, i) => {
                      const { col, total } = dayOverlaps[i]
                      const top    = (item.startMin - DAY_START * 60) * (HOUR_PX / 60)
                      const height = Math.max(item.visit.duracaoMin * (HOUR_PX / 60) - 4, 26)
                      const leftPct  = (col / total) * 100
                      const rightPct = ((total - col - 1) / total) * 100
                      const v      = item.visit
                      const hh     = v.dataHora.substring(11, 13)
                      const mm     = v.dataHora.substring(14, 16)
                      const endMin = item.startMin + v.duracaoMin
                      const ehh    = Math.floor(endMin / 60).toString().padStart(2, '0')
                      const emm    = (endMin % 60).toString().padStart(2, '0')
                      const strike = v.status === 'CANCELADA' ? 'line-through' : ''
                      return (
                        <div key={v.id}
                          className={`absolute rounded-lg border-l-[3px] px-2.5 py-1.5 cursor-pointer hover:brightness-95 transition-all overflow-hidden ${STATUS_VISIT[v.status]}`}
                          style={{ top: top + 2, height, left: `calc(${leftPct}% + 4px)`, right: `calc(${rightPct}% + 4px)` }}
                          onClick={() => openEditVisita(v)}
                        >
                          <div className={`text-[11px] font-bold tabular-nums ${strike}`}>
                            {hh}:{mm}–{ehh}:{emm}
                            <span className="font-normal opacity-60 ml-1">{durStr(v.duracaoMin)}</span>
                          </div>
                          <div className={`text-xs font-bold mt-0.5 truncate ${strike}`}>{v.cliente.nome}</div>
                          {height > 48 && (
                            <div className={`text-[11px] opacity-70 truncate ${strike}`}>{v.imovel.titulo}</div>
                          )}
                        </div>
                      )
                    })}

                    {/* Now line */}
                    {nowLinePx !== null && isToday(now) && (
                      <div className="absolute left-0 right-0 z-30 pointer-events-none" style={{ top: nowLinePx }}>
                        <div className="absolute left-0 -top-1 w-2 h-2 rounded-full bg-red-500" />
                        <div className="absolute left-2 right-0 top-0 h-0.5 bg-red-500 rounded-full" />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* ── View: Semana ────────────────────────────────────────────────────── */}
        {agendaView === 'semana' && (
          <>
            {/* BUG #8: overlay de loading ao navegar para semana de mês novo */}
            {weekLoading && (
              <div className="flex items-center justify-center py-8 gap-2 text-muted-foreground border-b border-slate-100">
                <div className="h-4 w-4 rounded-full border-2 border-blue-300 border-t-blue-600 animate-spin" />
                <span className="text-sm">Carregando agenda...</span>
              </div>
            )}
            {/* Day headers */}
            <div className="grid border-b border-slate-100"
                 style={{ gridTemplateColumns: '48px repeat(6, 1fr)' }}>
              <div className="bg-slate-50 border-r border-slate-100" />
              {weekDays.map(d => {
                const cnt = visitas.filter(v => isSameDay(d, v.dataHora)).length
                return (
                  <div key={d.toISOString()}
                    className={`border-r last:border-r-0 border-slate-100 py-2.5 flex flex-col items-center gap-0.5 ${isToday(d) ? 'bg-blue-50' : 'bg-slate-50'}`}>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {DIAS_SHORT[d.getDay()]}
                    </span>
                    <span className={`text-sm font-medium ${isToday(d) ? 'w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold' : 'text-slate-600'}`}>
                      {d.getDate()}
                    </span>
                    <span className={`text-[9px] font-semibold ${cnt > 0 ? 'text-blue-500' : 'text-slate-300'}`}>
                      {cnt > 0 ? `${cnt} vis.` : '—'}
                    </span>
                  </div>
                )
              })}
            </div>

            {/* Time grid */}
            <div ref={weekScrollRef} className="overflow-y-auto" style={{ maxHeight: 360 }}>
              <div className="flex" style={{ height: GRID_H }}>

                {/* Hour labels */}
                <div className="w-12 shrink-0 border-r border-slate-100 relative" style={{ background: '#f8fafc' }}>
                  {HOURS.map((h, i) => (
                    <div key={h} className="absolute left-0 right-0 border-b border-slate-100"
                         style={{ top: i * HOUR_PX, height: HOUR_PX }}>
                      <span className="absolute right-1.5 -top-[9px] text-[10px] font-semibold text-slate-400">
                        {h.toString().padStart(2, '0')}h
                      </span>
                    </div>
                  ))}
                </div>

                {/* Day columns */}
                {weekDays.map((d, ci) => {
                  const items   = weekDayItems(d)
                  const overlaps = assignOverlapCols(items)
                  return (
                    <div key={d.toISOString()}
                      className={`flex-1 relative border-r last:border-r-0 border-slate-100 ${isToday(d) ? 'bg-blue-50/40' : 'bg-white'}`}
                      style={{ height: GRID_H }}>
                      {/* Hour lines */}
                      {HOURS.map((_, i) => (
                        <div key={i} className="absolute left-0 right-0 border-b border-slate-100"
                             style={{ top: i * HOUR_PX }} />
                      ))}

                      {/* Visit blocks */}
                      {items.map((item, i) => {
                        const { col, total } = overlaps[i]
                        const top    = (item.startMin - DAY_START * 60) * (HOUR_PX / 60)
                        const height = Math.max(item.visit.duracaoMin * (HOUR_PX / 60) - 3, 18)
                        const lp     = (col / total) * 100
                        const rp     = ((total - col - 1) / total) * 100
                        const v   = item.visit
                        const hh  = v.dataHora.substring(11, 13)
                        const mm  = v.dataHora.substring(14, 16)
                        const strike = v.status === 'CANCELADA' ? 'line-through' : ''
                        const cls    = {
                          AGENDADA:  'bg-blue-100  text-blue-800  border-l-blue-500',
                          REALIZADA: 'bg-emerald-100 text-emerald-800 border-l-emerald-500',
                          CANCELADA: 'bg-red-100   text-red-800   border-l-red-500 opacity-60',
                        }[v.status]
                        return (
                          <div key={v.id}
                            className={`absolute rounded border-l-[3px] px-1.5 py-0.5 cursor-pointer hover:brightness-95 transition-all overflow-hidden z-10 ${cls}`}
                            style={{ top: top + 2, height, left: `calc(${lp}% + 3px)`, right: `calc(${rp}% + 3px)` }}
                            onClick={() => openEditVisita(v)}>
                            <div className="text-[9px] font-bold tabular-nums leading-none">{hh}:{mm}</div>
                            <div className={`text-[10px] font-semibold leading-tight truncate mt-0.5 ${strike}`}>{v.cliente.nome}</div>
                            {height > 38 && (
                              <div className={`text-[9px] opacity-70 truncate ${strike}`}>{v.imovel.titulo}</div>
                            )}
                          </div>
                        )
                      })}

                      {/* Now line (today only) */}
                      {isToday(d) && nowLinePx !== null && (
                        <div className="absolute left-0 right-0 z-30 pointer-events-none" style={{ top: nowLinePx }}>
                          <div className="absolute left-0 -top-1 w-2 h-2 rounded-full bg-red-500" />
                          <div className="absolute left-2 right-0 top-0 h-0.5 bg-red-500 rounded-full" />
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Legend */}
            <div className="px-5 py-2 border-t border-slate-100 bg-slate-50 flex items-center gap-4">
              <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Status:</span>
              {[
                { label: 'Agendada',  bg: 'bg-blue-200',    border: 'border-l-blue-500'    },
                { label: 'Realizada', bg: 'bg-emerald-200', border: 'border-l-emerald-500' },
                { label: 'Cancelada', bg: 'bg-red-200',     border: 'border-l-red-500'     },
              ].map(s => (
                <span key={s.label} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <span className={`w-2.5 h-1.5 rounded-sm inline-block border-l-2 ${s.bg} ${s.border}`} />
                  {s.label}
                </span>
              ))}
            </div>
          </>
        )}
      </Card>

      {/* ── 4. Top Oportunidades ─────────────────────────────────────────────── */}
      {(loading || topOportunidades.length > 0) && (
        <Card className="rounded-2xl shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
                <Star className="h-4 w-4 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800 leading-none">Top Oportunidades</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Matches com maior lead score nas etapas iniciais — aja agora
                </p>
              </div>
            </div>
            <Link href="/matches"
              className="text-[11px] font-semibold text-blue-600 hover:underline flex items-center gap-1">
              Ver todos <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          {loading ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Carregando...</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {topOportunidades.map(m => {
                const sc  = scoreLabel(m.leadScore)
                const cor = m.etapa?.cor ?? '#6B7280'
                return (
                  <Link key={m.id} href="/matches"
                    className="border border-slate-200 rounded-xl p-4 hover:border-slate-300 hover:shadow-sm transition-all flex flex-col gap-3">

                    {/* Imóvel */}
                    <div className="flex items-start gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0 mt-0.5">
                        <svg className="h-4 w-4 text-indigo-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                        </svg>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-slate-800 leading-snug line-clamp-1">{m.imovel.titulo}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {m.imovel.cidade.nome} · {fmtPreco(m.imovel.preco)}
                        </p>
                      </div>
                    </div>

                    {/* Cliente + etapa */}
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold text-slate-700 truncate">{m.perfil.cliente.nome}</p>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0"
                            style={{ background: cor + '18', color: cor, outline: `1px solid ${cor}40` }}>
                        {m.etapa.nome}
                      </span>
                    </div>

                    {/* Score + CTA */}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                      <div className="flex items-center gap-2">
                        <ScoreRing score={m.leadScore} />
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground leading-none">
                            Lead Score
                          </p>
                          <p className={`text-xs font-bold mt-0.5 ${sc.text}`}>{sc.label}</p>
                        </div>
                      </div>
                      <Link href="/agenda"
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-[11px] font-semibold hover:bg-blue-700 transition-colors shadow-sm"
                        onClick={e => e.stopPropagation()}>
                        <CalendarDays className="h-3 w-3" />
                        Agendar
                      </Link>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </Card>
      )}

      {/* ── 5. Bottom row: Precisam atenção + Funil ─────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Precisam de atenção (com Lead Score) */}
        <Card className="rounded-xl shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-500" />
              Precisam de atenção
            </CardTitle>
            <Link href="/matches"
              className="flex items-center gap-1 text-xs text-primary font-medium hover:underline">
              Ver matches <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </CardHeader>
          <CardContent className="pt-0">
            {loading ? (
              <p className="text-sm text-muted-foreground py-8 text-center">Carregando...</p>
            ) : precisamAtencao.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-emerald-400" />
                <p className="text-sm text-muted-foreground">
                  {emNegociacao === 0 ? 'Nenhum match atribuído ainda.' : 'Todos os matches estão em dia!'}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {precisamAtencao.map(m => {
                  const cor = m.etapa?.cor ?? '#6B7280'
                  const sc  = scoreLabel(m.leadScore)
                  return (
                    <div key={m.id} className="flex items-center justify-between py-2.5 gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{m.imovel.titulo}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {m.perfil.cliente.nome} · {m.imovel.cidade.nome}
                        </p>
                      </div>
                      <div className="shrink-0 flex flex-col items-end gap-1">
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                              style={{ backgroundColor: cor + '20', color: cor, outline: `1px solid ${cor}50` }}>
                          {m.etapa?.nome ?? '-'}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span className={`text-[10px] font-bold ${sc.text}`}>Score {m.leadScore}</span>
                          <span className="text-[10px] text-slate-300">·</span>
                          <span className="text-[10px] text-amber-600 font-medium">{daysSince(m.createdAt)}d</span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Funil — barras horizontais */}
        <Card className="rounded-xl shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Meu funil</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {loading ? (
              <p className="text-sm text-muted-foreground py-8 text-center">Carregando...</p>
            ) : funil.length === 0 || funil.every(f => f.n === 0) ? (
              <div className="text-center py-8">
                <GitMerge className="h-8 w-8 mx-auto mb-2 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">Nenhum match atribuído ainda</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {funil.map(f => (
                  <div key={f.nome} className="flex items-center gap-3">
                    <span className="text-[11px] text-muted-foreground w-36 truncate shrink-0">{f.nome}</span>
                    <div className="flex-1 h-4 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all"
                           style={{ width: `${Math.round((f.n / funilMax) * 100)}%`, background: f.cor }} />
                    </div>
                    <span className="text-xs font-bold text-slate-700 tabular-nums w-4 text-right">{f.n}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

      </div>

      {/* ── Modal: Editar Visita ──────────────────────────────────────────────── */}
      {editVisita && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
             onClick={() => setEditVisita(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col max-h-[92vh]"
               onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-semibold text-slate-800">Editar Visita</span>
                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                  editForm.status === 'AGENDADA'  ? 'bg-blue-50 text-blue-700 ring-1 ring-blue-200' :
                  editForm.status === 'REALIZADA' ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200' :
                                                    'bg-red-50 text-red-600 ring-1 ring-red-200'
                }`}>{editForm.status === 'AGENDADA' ? 'Agendada' : editForm.status === 'REALIZADA' ? 'Realizada' : 'Cancelada'}</span>
              </div>
              <button onClick={() => setEditVisita(null)}
                      className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Body */}
            <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">

              {/* Imóvel + Cliente (somente leitura) */}
              <div className="rounded-xl bg-slate-50 border border-slate-100 px-4 py-3 space-y-2">
                <div className="flex items-start gap-2">
                  <svg className="h-3.5 w-3.5 text-indigo-400 mt-0.5 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>
                  <div>
                    <p className="text-xs font-semibold text-slate-700">{editVisita.imovel.titulo}</p>
                    <p className="text-[11px] text-slate-400">{editVisita.imovel.bairro} · {editVisita.imovel.cidade.nome}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <svg className="h-3.5 w-3.5 text-slate-400 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                  <p className="text-xs font-semibold text-slate-700">{editVisita.cliente.nome}</p>
                  <p className="text-[11px] text-slate-400">{editVisita.cliente.email}</p>
                </div>
              </div>

              {/* Data + Hora */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600">Data *</label>
                  <input type="date" value={editForm.data}
                    onChange={e => setEditForm(f => ({ ...f, data: e.target.value }))}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600">Horário *</label>
                  <Select value={editForm.hora} onValueChange={v => setEditForm(f => ({ ...f, hora: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {VISITA_TIME_SLOTS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Duração + Status */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600">Duração</label>
                  <Select value={String(editForm.duracaoMin)} onValueChange={v => setEditForm(f => ({ ...f, duracaoMin: Number(v) }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {VISITA_DURACAO.map(o => <SelectItem key={o.v} value={String(o.v)}>{o.l}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600">Status</label>
                  <Select value={editForm.status} onValueChange={v => setEditForm(f => ({ ...f, status: v as Visita['status'] }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="AGENDADA">Agendada</SelectItem>
                      <SelectItem value="REALIZADA">Realizada</SelectItem>
                      <SelectItem value="CANCELADA">Cancelada</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Observações */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600">Observações</label>
                <textarea rows={2} value={editForm.observacoes}
                  onChange={e => setEditForm(f => ({ ...f, observacoes: e.target.value }))}
                  placeholder="Notas sobre a visita..."
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none" />
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-5 py-4 border-t bg-slate-50 rounded-b-2xl">
              <button onClick={handleDeleteVisita} disabled={editDeleting}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50">
                <Trash2 className="h-4 w-4" />
                {editDeleting ? 'Removendo...' : 'Remover'}
              </button>
              <div className="flex items-center gap-2">
                <button onClick={() => setEditVisita(null)}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-slate-500 hover:bg-slate-100 transition-colors">
                  Cancelar
                </button>
                <button onClick={handleSaveEdit} disabled={editSaving}
                  className="px-5 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50">
                  {editSaving ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
