'use client'
import { useState, useEffect } from 'react'
import {
  ChevronLeft, ChevronRight, Plus, X, Trash2, CalendarDays,
  Clock, MapPin, User, AlignLeft, UserRound, CheckCircle2,
} from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { getCurrentUser } from '@/lib/auth'
import { cn } from '@/lib/utils'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'

// ── Types ─────────────────────────────────────────────────────────────────────
type VisitaStatus = 'AGENDADA' | 'REALIZADA' | 'CANCELADA'

interface ClienteResumido {
  id: string
  nome: string
  email: string
  whatsapp?: string
}

interface Visita {
  id: string
  imovelId: string
  imovel: { id: string; titulo: string; bairro: string; cidade: { nome: string } }
  clienteId: string
  cliente: ClienteResumido
  corretorId: string | null
  corretor: { id: string; name: string } | null
  dataHora: string
  duracaoMin: number
  status: VisitaStatus
  observacoes: string | null
}

interface Imovel {
  id: string
  titulo: string
  bairro: string
  cidade: { nome: string }
}

interface Corretor {
  id: string
  name: string
}

// ── Constants ─────────────────────────────────────────────────────────────────
const STATUS_CFG: Record<VisitaStatus, { label: string; chip: string; dot: string; badge: string }> = {
  AGENDADA:  { label: 'Agendada',  chip: 'bg-blue-500 text-white',    dot: 'bg-blue-500',    badge: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200'         },
  REALIZADA: { label: 'Realizada', chip: 'bg-emerald-500 text-white', dot: 'bg-emerald-500', badge: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200' },
  CANCELADA: { label: 'Cancelada', chip: 'bg-red-500 text-white',     dot: 'bg-red-500',     badge: 'bg-red-50 text-red-600 ring-1 ring-red-200'            },
}

const MESES = [
  'Janeiro','Fevereiro','Marco','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro',
]

const DIAS_SEMANA = ['Dom','Seg','Ter','Qua','Qui','Sex','Sab']

const DURACAO_OPTS = [
  { v: 30,  l: '30 min'   },
  { v: 60,  l: '1 hora'   },
  { v: 90,  l: '1h 30min' },
  { v: 120, l: '2 horas'  },
  { v: 180, l: '3 horas'  },
]

// Slots de 30 em 30 min, 07:00 – 21:00
const TIME_SLOTS = Array.from({ length: 29 }, (_, i) => {
  const tot = 7 * 60 + i * 30
  return `${String(Math.floor(tot / 60)).padStart(2,'0')}:${String(tot % 60).padStart(2,'0')}`
})

// ── Helpers ───────────────────────────────────────────────────────────────────
function isoTime(iso: string) { return iso.substring(11, 16) }
function isoDate(iso: string) { return iso.substring(0, 10) }
function buildISO(date: string, time: string) { return `${date}T${time}:00.000Z` }

function todayISO() {
  const d = new Date()
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2,'0')}-${String(d.getUTCDate()).padStart(2,'0')}`
}

const emptyForm = (defaultDate?: string) => ({
  imovelId:   '',
  clienteId:  '',
  corretorId: '',
  data:        defaultDate ?? todayISO(),
  hora:        '09:00',
  duracaoMin:  60,
  status:      'AGENDADA' as VisitaStatus,
  observacoes: '',
})

// ── Page ──────────────────────────────────────────────────────────────────────
export default function AgendaPage() {
  const currentUser = getCurrentUser()
  const isAdmin     = currentUser?.role === 'ADMIN'

  // ── Navigation ──────────────────────────────────────────────────────────────
  const now = new Date()
  const [year,  setYear]  = useState(now.getUTCFullYear())
  const [month, setMonth] = useState(now.getUTCMonth()) // 0-based

  function prevMonth() {
    if (month === 0) { setYear(y => y - 1); setMonth(11) }
    else setMonth(m => m - 1)
  }
  function nextMonth() {
    if (month === 11) { setYear(y => y + 1); setMonth(0) }
    else setMonth(m => m + 1)
  }
  function goToday() {
    setYear(now.getUTCFullYear())
    setMonth(now.getUTCMonth())
  }

  // ── Data ────────────────────────────────────────────────────────────────────
  const [visitas,    setVisitas]    = useState<Visita[]>([])
  const [imoveis,    setImoveis]    = useState<Imovel[]>([])
  const [clientes,   setClientes]   = useState<ClienteResumido[]>([])
  const [corretores, setCorretores] = useState<Corretor[]>([])
  const [loading,    setLoading]    = useState(true)
  const [filtroCorretor, setFiltroCorretor] = useState('__todos__')

  const mesParam = `${year}-${String(month + 1).padStart(2,'0')}`

  useEffect(() => {
    setLoading(true)
    const qs = new URLSearchParams({ mes: mesParam })
    if (isAdmin && filtroCorretor !== '__todos__') qs.set('corretorId', filtroCorretor)
    api.get<Visita[]>(`/visitas?${qs}`)
      .then(setVisitas)
      .catch(() => toast.error('Erro ao carregar visitas'))
      .finally(() => setLoading(false))
  }, [mesParam, filtroCorretor, isAdmin])

  useEffect(() => {
    api.get<Imovel[]>('/imoveis').then(setImoveis).catch(() => {})
    api.get<ClienteResumido[]>('/clientes').then(setClientes).catch(() => {})
    if (isAdmin) {
      api.get<{ id: string; name: string; role: string }[]>('/users')
        .then(users => setCorretores(users.filter(u => u.role === 'CORRETOR')))
        .catch(() => {})
    }
  }, [isAdmin])

  // ── Modal ───────────────────────────────────────────────────────────────────
  const [modalOpen,  setModalOpen]  = useState(false)
  const [modalMode,  setModalMode]  = useState<'create' | 'edit'>('create')
  const [editTarget, setEditTarget] = useState<Visita | null>(null)
  const [form,       setForm]       = useState(emptyForm())
  const [saving,     setSaving]     = useState(false)
  const [deleting,   setDeleting]   = useState(false)

  function openCreate(defaultDate?: string) {
    setModalMode('create')
    setEditTarget(null)
    setForm(emptyForm(defaultDate))
    setModalOpen(true)
  }

  function openEdit(v: Visita) {
    setModalMode('edit')
    setEditTarget(v)
    setForm({
      imovelId:   v.imovelId,
      clienteId:  v.clienteId,
      corretorId: v.corretorId ?? '',
      data:        isoDate(v.dataHora),
      hora:        isoTime(v.dataHora),
      duracaoMin:  v.duracaoMin,
      status:      v.status,
      observacoes: v.observacoes ?? '',
    })
    setModalOpen(true)
  }

  function setF<K extends keyof ReturnType<typeof emptyForm>>(
    key: K, val: ReturnType<typeof emptyForm>[K],
  ) {
    setForm(f => ({ ...f, [key]: val }))
  }

  async function handleSave() {
    if (!form.imovelId)  return toast.error('Selecione um imovel')
    if (!form.clienteId) return toast.error('Selecione o cliente')
    if (!form.data)      return toast.error('Selecione a data')

    const payload = {
      imovelId:   form.imovelId,
      clienteId:  form.clienteId,
      corretorId: form.corretorId  || null,
      dataHora:   buildISO(form.data, form.hora),
      duracaoMin: form.duracaoMin,
      status:     form.status,
      observacoes: form.observacoes || null,
    }

    setSaving(true)
    try {
      if (modalMode === 'create') {
        const nova = await api.post<Visita>('/visitas', payload)
        setVisitas(prev => [...prev, nova].sort((a,b) => a.dataHora.localeCompare(b.dataHora)))
        toast.success('Visita agendada')
      } else {
        const upd = await api.patch<Visita>(`/visitas/${editTarget!.id}`, payload)
        setVisitas(prev => prev.map(v => v.id === upd.id ? upd : v))
        toast.success('Visita atualizada')
      }
      setModalOpen(false)
    } catch {
      toast.error('Erro ao salvar visita')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!editTarget) return
    setDeleting(true)
    try {
      await api.delete(`/visitas/${editTarget.id}`)
      setVisitas(prev => prev.filter(v => v.id !== editTarget.id))
      toast.success('Visita removida')
      setModalOpen(false)
    } catch {
      toast.error('Erro ao remover visita')
    } finally {
      setDeleting(false)
    }
  }

  // ── Calendar grid ────────────────────────────────────────────────────────────
  const firstDow   = new Date(Date.UTC(year, month, 1)).getUTCDay()
  const daysInMon  = new Date(Date.UTC(year, month + 1, 0)).getUTCDate()

  const cells: (number | null)[] = [
    ...Array(firstDow).fill(null),
    ...Array.from({ length: daysInMon }, (_, i) => i + 1),
  ]
  while (cells.length % 7 !== 0) cells.push(null)
  const rows = cells.length / 7

  const byDay: Record<number, Visita[]> = {}
  for (const v of visitas) {
    const d = new Date(v.dataHora)
    const vy = d.getUTCFullYear(), vm = d.getUTCMonth(), vd = d.getUTCDate()
    if (vy === year && vm === month) {
      byDay[vd] = [...(byDay[vd] ?? []), v]
    }
  }
  Object.values(byDay).forEach(arr =>
    arr.sort((a,b) => a.dataHora.localeCompare(b.dataHora)),
  )

  const isToday = (day: number) =>
    day === now.getUTCDate() && month === now.getUTCMonth() && year === now.getUTCFullYear()

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-4 h-full">

      {/* ── Cabeçalho ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5">
          <button onClick={prevMonth} className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button onClick={nextMonth} className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors">
            <ChevronRight className="h-5 w-5" />
          </button>
          <h1 className="text-xl font-bold text-slate-800 min-w-[190px]">
            {MESES[month]} <span className="text-slate-400 font-normal">{year}</span>
          </h1>
          <button onClick={goToday} className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
            Hoje
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isAdmin && corretores.length > 0 && (
            <Select value={filtroCorretor} onValueChange={setFiltroCorretor}>
              <SelectTrigger className="h-9 w-[170px] text-sm">
                <SelectValue placeholder="Todos corretores" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__todos__">Todos corretores</SelectItem>
                {corretores.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <div className="hidden md:flex items-center gap-3 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-100">
            {(Object.entries(STATUS_CFG) as [VisitaStatus, typeof STATUS_CFG[VisitaStatus]][]).map(([s, cfg]) => (
              <div key={s} className="flex items-center gap-1.5">
                <span className={cn('w-2.5 h-2.5 rounded-full', cfg.dot)} />
                <span className="text-[11px] text-slate-500">{cfg.label}</span>
              </div>
            ))}
          </div>

          <button
            onClick={() => openCreate()}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors shadow-sm"
          >
            <Plus className="h-4 w-4" />
            Nova Visita
          </button>
        </div>
      </div>

      {/* ── Calendário ── */}
      <Card className="shadow-sm rounded-xl overflow-hidden flex-1 flex flex-col">
        <div className="grid grid-cols-7 bg-slate-50 border-b">
          {DIAS_SEMANA.map(d => (
            <div key={d} className="text-center text-[11px] font-semibold text-slate-400 py-2.5 uppercase tracking-wider">
              {d}
            </div>
          ))}
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center text-slate-400 text-sm py-20">
            Carregando...
          </div>
        ) : (
          <div
            className="grid grid-cols-7 flex-1"
            style={{ gridTemplateRows: `repeat(${rows}, minmax(108px, 1fr))` }}
          >
            {cells.map((day, idx) => {
              const dayVisitas = day ? (byDay[day] ?? []) : []
              const MAX_CHIPS  = 3
              const overflow   = dayVisitas.length - MAX_CHIPS
              const isWk       = idx % 7 === 0 || idx % 7 === 6
              const dayStr     = day
                ? `${year}-${String(month + 1).padStart(2,'0')}-${String(day).padStart(2,'0')}`
                : ''

              return (
                <div
                  key={idx}
                  onClick={() => day && openCreate(dayStr)}
                  className={cn(
                    'border-r border-b relative p-1 transition-colors',
                    day ? 'cursor-pointer hover:bg-blue-50/50 group' : 'bg-slate-50/50 pointer-events-none',
                    isWk && day ? 'bg-slate-50/40' : '',
                  )}
                >
                  {day && (
                    <>
                      <div className="flex items-start justify-between mb-0.5">
                        <span className="invisible text-[11px]">x</span>
                        <span className={cn(
                          'text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full transition-colors',
                          isToday(day)
                            ? 'bg-blue-600 text-white font-bold'
                            : 'text-slate-600 group-hover:bg-blue-100 group-hover:text-blue-700',
                        )}>
                          {day}
                        </span>
                      </div>

                      <div className="space-y-[2px]">
                        {dayVisitas.slice(0, MAX_CHIPS).map(v => {
                          const cfg = STATUS_CFG[v.status]
                          return (
                            <button
                              key={v.id}
                              onClick={e => { e.stopPropagation(); openEdit(v) }}
                              title={`${isoTime(v.dataHora)} — ${v.cliente.nome}\n${v.imovel.titulo}`}
                              className={cn(
                                'w-full text-left flex items-center gap-1 px-1.5 py-[2px] rounded text-[11px] font-medium truncate hover:opacity-80 transition-opacity',
                                cfg.chip,
                                v.status === 'CANCELADA' && 'line-through opacity-50',
                              )}
                            >
                              <span className="shrink-0 font-bold tabular-nums">{isoTime(v.dataHora)}</span>
                              <span className="truncate">{v.cliente.nome}</span>
                            </button>
                          )
                        })}
                        {overflow > 0 && (
                          <button
                            onClick={e => { e.stopPropagation(); openCreate(dayStr) }}
                            className="w-full text-left text-[11px] text-blue-600 font-medium px-1.5 py-[1px] hover:underline"
                          >
                            +{overflow} mais
                          </button>
                        )}
                      </div>

                      <div className="absolute top-1 left-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Plus className="h-3.5 w-3.5 text-blue-400" />
                      </div>
                    </>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </Card>

      {/* ── Modal ── */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          onClick={() => setModalOpen(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-5 w-5 text-blue-600" />
                <h2 className="text-base font-semibold text-slate-800">
                  {modalMode === 'create' ? 'Nova Visita' : 'Editar Visita'}
                </h2>
                {modalMode === 'edit' && editTarget && (
                  <span className={cn('ml-1 text-[11px] font-semibold px-2 py-0.5 rounded-full', STATUS_CFG[editTarget.status].badge)}>
                    {STATUS_CFG[editTarget.status].label}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {modalMode === 'edit' && editTarget?.status === 'AGENDADA' && (
                  <Link
                    href={`/visitas/${editTarget.id}/checkin`}
                    className="md:hidden flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Check-in
                  </Link>
                )}
                <button onClick={() => setModalOpen(false)} className="p-1 rounded-md hover:bg-slate-100 text-slate-400 hover:text-slate-600">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="overflow-y-auto flex-1 px-6 py-5 space-y-4">

              {/* Imovel */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5" /> Imovel *
                </Label>
                <Select value={form.imovelId} onValueChange={v => setF('imovelId', v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o imovel..." />
                  </SelectTrigger>
                  <SelectContent>
                    {imoveis.length === 0 && (
                      <SelectItem value="__loading__" disabled>Carregando...</SelectItem>
                    )}
                    {imoveis.map(im => (
                      <SelectItem key={im.id} value={im.id}>
                        <span className="font-medium">{im.titulo}</span>
                        <span className="text-slate-400 ml-1.5 text-xs">{im.bairro}, {im.cidade.nome}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Cliente */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
                  <UserRound className="h-3.5 w-3.5" /> Cliente *
                </Label>
                {clientes.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-1">
                    Nenhum cliente cadastrado.{' '}
                    <a href="/clientes" className="text-blue-600 underline">Cadastrar →</a>
                  </p>
                ) : (
                  <Select value={form.clienteId} onValueChange={v => setF('clienteId', v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o cliente..." />
                    </SelectTrigger>
                    <SelectContent>
                      {clientes.map(c => (
                        <SelectItem key={c.id} value={c.id}>
                          <span className="font-medium">{c.nome}</span>
                          <span className="text-slate-400 ml-1.5 text-xs">{c.email}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {/* Data + Hora */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
                    <CalendarDays className="h-3.5 w-3.5" /> Data *
                  </Label>
                  <Input type="date" value={form.data} onChange={e => setF('data', e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" /> Horario *
                  </Label>
                  <Select value={form.hora} onValueChange={v => setF('hora', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {TIME_SLOTS.map(t => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Duracao + Status */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-600">Duracao</Label>
                  <Select value={String(form.duracaoMin)} onValueChange={v => setF('duracaoMin', Number(v))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {DURACAO_OPTS.map(o => (
                        <SelectItem key={o.v} value={String(o.v)}>{o.l}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-600">Status</Label>
                  <Select value={form.status} onValueChange={v => setF('status', v as VisitaStatus)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(Object.entries(STATUS_CFG) as [VisitaStatus, typeof STATUS_CFG[VisitaStatus]][]).map(([k, cfg]) => (
                        <SelectItem key={k} value={k}>
                          <div className="flex items-center gap-2">
                            <span className={cn('w-2 h-2 rounded-full', cfg.dot)} />
                            {cfg.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Corretor (ADMIN) */}
              {isAdmin && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5" /> Corretor
                  </Label>
                  <Select
                    value={form.corretorId || '__nenhum__'}
                    onValueChange={v => setF('corretorId', v === '__nenhum__' ? '' : v)}
                  >
                    <SelectTrigger><SelectValue placeholder="Sem corretor" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__nenhum__">— Sem corretor</SelectItem>
                      {corretores.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Observacoes */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
                  <AlignLeft className="h-3.5 w-3.5" /> Observacoes
                </Label>
                <textarea
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 resize-none"
                  rows={3}
                  placeholder="Notas internas sobre a visita..."
                  value={form.observacoes}
                  onChange={e => setF('observacoes', e.target.value)}
                />
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-6 py-4 border-t bg-slate-50 rounded-b-2xl">
              <div>
                {modalMode === 'edit' && (
                  <button
                    onClick={handleDelete}
                    disabled={deleting}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                  >
                    <Trash2 className="h-4 w-4" />
                    {deleting ? 'Removendo...' : 'Remover'}
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-5 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 shadow-sm"
                >
                  {saving ? 'Salvando...' : modalMode === 'create' ? 'Agendar' : 'Salvar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
