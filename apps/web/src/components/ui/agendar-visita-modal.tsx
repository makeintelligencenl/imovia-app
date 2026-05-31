'use client'
import { useState } from 'react'
import { CalendarDays, X } from 'lucide-react'
import { toast } from 'sonner'
import { api } from '@/lib/api'

// ── Time slots das 07:00 às 21:30 de 30 em 30 minutos ───────────────────────
export const VISITA_TIME_SLOTS = Array.from({ length: 29 }, (_, i) => {
  const tot = 7 * 60 + i * 30
  return `${String(Math.floor(tot / 60)).padStart(2, '0')}:${String(tot % 60).padStart(2, '0')}`
})

export const VISITA_DURACAO = [
  { v: 30,  l: '30 min'   },
  { v: 60,  l: '1 hora'   },
  { v: 90,  l: '1h 30min' },
  { v: 120, l: '2 horas'  },
]

// ── Tipos ────────────────────────────────────────────────────────────────────
export interface VisitaRapidaData {
  matchId:         string
  imovelId:        string
  imovelTitulo:    string
  imovelLocal:     string
  clienteId:       string
  clienteNome:     string
  clienteEmail:    string
  clienteWhatsapp: string
  corretorId:      string | null
}

interface Corretor {
  id:    string
  name:  string
  email: string
}

// ── Componente ───────────────────────────────────────────────────────────────
export function AgendarVisitaModal({
  data,
  corretores,
  isAdmin,
  onClose,
}: {
  data:       VisitaRapidaData
  corretores: Corretor[]
  isAdmin:    boolean
  onClose:    () => void
}) {
  const [form, setForm] = useState({
    data:        new Date().toISOString().substring(0, 10),
    hora:        '09:00',
    duracaoMin:  60,
    corretorId:  data.corretorId ?? '',
    observacoes: '',
  })
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!form.data) return toast.error('Selecione a data')
    setSaving(true)
    try {
      await api.post('/visitas', {
        matchId:     data.matchId,
        imovelId:    data.imovelId,
        clienteId:   data.clienteId,
        corretorId:  form.corretorId || null,
        // NOTA BUG #1 (timezone): o sistema usa "UTC naïf" — armazena a hora
        // digitada pelo usuário diretamente como UTC (ex: 09:00 → T09:00Z),
        // sem aplicar o offset do fuso horário local. Todos os displays usam
        // substring(11,16) para ler a hora UTC da string, criando consistência
        // interna. Migrar para UTC real exige script de migração dos dados
        // existentes e mudança de todos os displays para getHours() local.
        // TODO: implementar junto com a migração de dados na Sprint B.
        dataHora:    `${form.data}T${form.hora}:00.000Z`,
        duracaoMin:  form.duracaoMin,
        status:      'AGENDADA',
        observacoes: form.observacoes || null,
      })
      toast.success('Visita adicionada à agenda')
      onClose()
    } catch {
      toast.error('Erro ao agendar visita')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b bg-blue-50 rounded-t-2xl">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center h-8 w-8 rounded-full bg-blue-100">
              <CalendarDays className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800">Agendar Visita</p>
              <p className="text-[11px] text-slate-500">Etapa alterada para Visita Agendada</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md hover:bg-blue-100 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          {/* Imovel + cliente (somente leitura) */}
          <div className="rounded-xl bg-slate-50 border border-slate-100 px-4 py-3 space-y-1.5">
            <div className="flex items-start gap-2">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide w-16 shrink-0 mt-0.5">Imóvel</span>
              <span className="text-sm font-medium text-slate-700 leading-snug">
                {data.imovelTitulo}
                <span className="text-xs text-slate-400 font-normal ml-1">({data.imovelLocal})</span>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide w-16 shrink-0">Cliente</span>
              <span className="text-sm font-medium text-slate-700">{data.clienteNome}</span>
            </div>
            {data.clienteEmail && (
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide w-16 shrink-0">E-mail</span>
                <span className="text-xs text-slate-500">{data.clienteEmail}</span>
              </div>
            )}
            {data.clienteWhatsapp && (
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide w-16 shrink-0">WhatsApp</span>
                <span className="text-xs text-slate-500">{data.clienteWhatsapp}</span>
              </div>
            )}
          </div>

          {/* Data + Hora */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600">Data *</label>
              <input
                type="date"
                value={form.data}
                onChange={e => setForm(f => ({ ...f, data: e.target.value }))}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600">Horário *</label>
              <select
                value={form.hora}
                onChange={e => setForm(f => ({ ...f, hora: e.target.value }))}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {VISITA_TIME_SLOTS.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Duração */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-600">Duração</label>
            <select
              value={form.duracaoMin}
              onChange={e => setForm(f => ({ ...f, duracaoMin: Number(e.target.value) }))}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {VISITA_DURACAO.map(o => (
                <option key={o.v} value={o.v}>{o.l}</option>
              ))}
            </select>
          </div>

          {/* Corretor (só ADMIN) */}
          {isAdmin && corretores.length > 0 && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600">Corretor</label>
              <select
                value={form.corretorId || '__nenhum__'}
                onChange={e => setForm(f => ({ ...f, corretorId: e.target.value === '__nenhum__' ? '' : e.target.value }))}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="__nenhum__">— Sem corretor</option>
                {corretores.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Observações */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-600">Observações</label>
            <textarea
              rows={2}
              placeholder="Notas sobre a visita..."
              value={form.observacoes}
              onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-4 border-t bg-slate-50 rounded-b-2xl">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium text-slate-500 hover:bg-slate-100 transition-colors"
          >
            Pular
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 shadow-sm"
          >
            <CalendarDays className="h-4 w-4" />
            {saving ? 'Agendando...' : 'Agendar Visita'}
          </button>
        </div>
      </div>
    </div>
  )
}
