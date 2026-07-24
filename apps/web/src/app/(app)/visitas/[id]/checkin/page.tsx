'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  ArrowLeft, MapPin, User, Clock, Home, CheckCircle2,
  XCircle, AlignLeft, Loader2,
} from 'lucide-react'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'

type VisitaStatus = 'AGENDADA' | 'REALIZADA' | 'CANCELADA'

interface Visita {
  id: string
  status: VisitaStatus
  dataHora: string
  duracaoMin: number
  observacoes: string | null
  imovel: { titulo: string; bairro: string; cidade: { nome: string } }
  cliente: { nome: string; whatsapp?: string }
  corretor: { name: string } | null
}

export default function CheckinPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [visita, setVisita]         = useState<Visita | null>(null)
  const [loading, setLoading]       = useState(true)
  const [saving, setSaving]         = useState(false)
  const [observacoes, setObservacoes] = useState('')
  const [status, setStatus]         = useState<'REALIZADA' | 'CANCELADA'>('REALIZADA')

  useEffect(() => {
    api.get<Visita>(`/visitas/${id}`)
      .then((v) => {
        setVisita(v)
        setObservacoes(v.observacoes ?? '')
      })
      .catch(() => toast.error('Visita não encontrada'))
      .finally(() => setLoading(false))
  }, [id])

  async function handleSubmit() {
    setSaving(true)
    try {
      await api.patch(`/visitas/${id}`, { status, observacoes: observacoes || null })
      toast.success(status === 'REALIZADA' ? 'Check-in confirmado!' : 'Visita cancelada')
      router.push('/agenda')
    } catch {
      toast.error('Erro ao salvar. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  function formatDataHora(iso: string) {
    const d = new Date(iso)
    return {
      data: d.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' }),
      hora: d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    )
  }

  if (!visita) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 text-center px-6">
        <XCircle className="h-10 w-10 text-red-300" />
        <p className="text-slate-600 font-medium">Visita não encontrada</p>
        <button onClick={() => router.back()} className="text-blue-600 text-sm">Voltar</button>
      </div>
    )
  }

  if (visita.status !== 'AGENDADA') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 text-center px-6">
        <CheckCircle2 className="h-10 w-10 text-emerald-400" />
        <p className="text-slate-700 font-semibold">Visita já {visita.status === 'REALIZADA' ? 'realizada' : 'cancelada'}</p>
        <button onClick={() => router.push('/agenda')} className="text-blue-600 text-sm mt-2">Ver agenda</button>
      </div>
    )
  }

  const { data, hora } = formatDataHora(visita.dataHora)

  return (
    <div className="max-w-lg mx-auto space-y-4 pb-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
          <ArrowLeft className="h-5 w-5 text-slate-500" />
        </button>
        <div>
          <h1 className="text-xl font-bold tracking-tight">Check-in de visita</h1>
          <p className="text-sm text-muted-foreground">Confirme a presença e registre observações</p>
        </div>
      </div>

      {/* Detalhes da visita */}
      <div className="bg-white rounded-2xl border border-border p-4 space-y-3">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-xl bg-blue-50 shrink-0">
            <Home className="h-4 w-4 text-blue-500" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800">{visita.imovel.titulo}</p>
            <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
              <MapPin className="h-3 w-3" />{visita.imovel.bairro}, {visita.imovel.cidade.nome}
            </p>
          </div>
        </div>

        <div className="border-t border-border pt-3 grid grid-cols-2 gap-3">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-slate-400 shrink-0" />
            <div>
              <p className="text-[10px] text-slate-400 uppercase tracking-wide">Horário</p>
              <p className="text-xs font-medium text-slate-700">{hora} · {visita.duracaoMin}min</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-slate-400 shrink-0" />
            <div>
              <p className="text-[10px] text-slate-400 uppercase tracking-wide">Cliente</p>
              <p className="text-xs font-medium text-slate-700 truncate">{visita.cliente.nome}</p>
            </div>
          </div>
        </div>

        <div className="border-t border-border pt-3">
          <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-1">Data</p>
          <p className="text-xs font-medium text-slate-700 capitalize">{data}</p>
        </div>
      </div>

      {/* Resultado da visita */}
      <div className="bg-white rounded-2xl border border-border p-4 space-y-3">
        <p className="text-sm font-semibold text-slate-800">Resultado da visita</p>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setStatus('REALIZADA')}
            className={cn(
              'flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all',
              status === 'REALIZADA'
                ? 'border-emerald-500 bg-emerald-50'
                : 'border-border bg-slate-50 hover:bg-slate-100',
            )}
          >
            <CheckCircle2 className={cn('h-6 w-6', status === 'REALIZADA' ? 'text-emerald-500' : 'text-slate-300')} />
            <span className={cn('text-xs font-semibold', status === 'REALIZADA' ? 'text-emerald-700' : 'text-slate-400')}>
              Realizada
            </span>
          </button>
          <button
            onClick={() => setStatus('CANCELADA')}
            className={cn(
              'flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all',
              status === 'CANCELADA'
                ? 'border-red-400 bg-red-50'
                : 'border-border bg-slate-50 hover:bg-slate-100',
            )}
          >
            <XCircle className={cn('h-6 w-6', status === 'CANCELADA' ? 'text-red-400' : 'text-slate-300')} />
            <span className={cn('text-xs font-semibold', status === 'CANCELADA' ? 'text-red-600' : 'text-slate-400')}>
              Cancelada
            </span>
          </button>
        </div>
      </div>

      {/* Observações */}
      <div className="bg-white rounded-2xl border border-border p-4 space-y-2">
        <div className="flex items-center gap-2">
          <AlignLeft className="h-4 w-4 text-slate-400" />
          <p className="text-sm font-semibold text-slate-800">Observações</p>
        </div>
        <textarea
          value={observacoes}
          onChange={(e) => setObservacoes(e.target.value)}
          placeholder="Cliente gostou do imóvel, pediu proposta..."
          rows={4}
          className="w-full text-sm border border-border rounded-xl p-3 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 bg-slate-50"
        />
      </div>

      {/* Botão confirmar */}
      <button
        onClick={handleSubmit}
        disabled={saving}
        className={cn(
          'w-full py-3.5 rounded-xl font-semibold text-sm text-white transition-all',
          status === 'REALIZADA'
            ? 'bg-emerald-500 hover:bg-emerald-600 active:scale-[0.98]'
            : 'bg-red-500 hover:bg-red-600 active:scale-[0.98]',
          saving && 'opacity-60 cursor-not-allowed',
        )}
      >
        {saving ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />Salvando...
          </span>
        ) : status === 'REALIZADA' ? (
          'Confirmar check-in'
        ) : (
          'Cancelar visita'
        )}
      </button>
    </div>
  )
}
