'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  GitMerge, CalendarDays, Bell, ArrowLeft,
  CheckCircle2, Clock, Home, Loader2,
} from 'lucide-react'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'

interface Visita {
  id: string
  status: string
  dataHora: string
  imovel: { titulo: string; bairro: string; cidade: { nome: string } }
  cliente: { nome: string }
}

interface Match {
  id: string
  leadScore: number
  createdAt: string
  etapa: { nome: string; cor: string }
  imovel: { titulo: string; cidade: { nome: string } }
  perfil: { cliente: { nome: string } }
}

interface Notificacao {
  id: string
  tipo: 'match' | 'visita_hoje' | 'visita_proxima'
  titulo: string
  descricao: string
  tempo: string
  href: string
  lida: boolean
}

function tempoRelativo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const min  = Math.floor(diff / 60000)
  const h    = Math.floor(diff / 3600000)
  const d    = Math.floor(diff / 86400000)
  if (min < 1)  return 'agora'
  if (min < 60) return `${min}min atrás`
  if (h < 24)   return `${h}h atrás`
  return `${d}d atrás`
}

function horaVisita(iso: string): string {
  const d = new Date(iso)
  const diff = d.getTime() - Date.now()
  const min  = Math.floor(diff / 60000)
  const h    = Math.floor(diff / 3600000)
  if (diff < 0)   return 'já iniciou'
  if (min < 60)   return `em ${min}min`
  if (h < 24)     return `em ${h}h`
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

const ICON: Record<string, { icon: React.ElementType; bg: string; color: string }> = {
  match:          { icon: GitMerge,    bg: 'bg-blue-50',    color: 'text-blue-500'   },
  visita_hoje:    { icon: CalendarDays, bg: 'bg-amber-50',  color: 'text-amber-500'  },
  visita_proxima: { icon: Clock,        bg: 'bg-purple-50', color: 'text-purple-500' },
}

export default function NotificacoesPage() {
  const router = useRouter()
  const [notifs, setNotifs]   = useState<Notificacao[]>([])
  const [loading, setLoading] = useState(true)
  const [lidas, setLidas]     = useState<Set<string>>(new Set())

  useEffect(() => {
    const hoje = new Date()
    const mes  = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`

    Promise.allSettled([
      api.get<Match[]>('/matches'),
      api.get<Visita[]>(`/visitas?mes=${mes}`),
    ]).then(([matchesRes, visitasRes]) => {
      const lista: Notificacao[] = []

      // Matches recentes (últimas 48h)
      if (matchesRes.status === 'fulfilled') {
        const recentes = matchesRes.value
          .filter((m) => Date.now() - new Date(m.createdAt).getTime() < 48 * 3600000)
          .slice(0, 5)
        recentes.forEach((m) => {
          lista.push({
            id:         `match-${m.id}`,
            tipo:       'match',
            titulo:     'Novo match encontrado',
            descricao:  `${m.perfil.cliente.nome} → ${m.imovel.titulo}`,
            tempo:      tempoRelativo(m.createdAt),
            href:       '/dashboard/matches',
            lida:       false,
          })
        })
      }

      // Visitas de hoje e próximas 24h
      if (visitasRes.status === 'fulfilled') {
        const agora    = Date.now()
        const amanha   = agora + 24 * 3600000
        const visitasFuturas = visitasRes.value.filter(
          (v) => v.status === 'AGENDADA' && new Date(v.dataHora).getTime() > agora - 3600000,
        )
        visitasFuturas.forEach((v) => {
          const t   = new Date(v.dataHora).getTime()
          const hoje = t <= amanha
          lista.push({
            id:        `visita-${v.id}`,
            tipo:      hoje ? 'visita_hoje' : 'visita_proxima',
            titulo:    hoje ? 'Visita hoje' : 'Visita agendada',
            descricao: `${v.cliente.nome} · ${v.imovel.titulo}`,
            tempo:     horaVisita(v.dataHora),
            href:      `/dashboard/visitas/${v.id}/checkin`,
            lida:      false,
          })
        })
      }

      // Ordena: não lidas primeiro, depois por ordem de inserção
      setNotifs(lista)
    }).finally(() => setLoading(false))
  }, [])

  function marcarLida(id: string) {
    setLidas((prev) => new Set([...prev, id]))
  }

  function marcarTodas() {
    setLidas(new Set(notifs.map((n) => n.id)))
  }

  const naoLidas = notifs.filter((n) => !lidas.has(n.id)).length

  return (
    <div className="max-w-lg mx-auto space-y-4 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
            <ArrowLeft className="h-5 w-5 text-slate-500" />
          </button>
          <div>
            <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
              Notificações
              {naoLidas > 0 && (
                <span className="text-xs font-semibold bg-blue-500 text-white px-2 py-0.5 rounded-full">
                  {naoLidas}
                </span>
              )}
            </h1>
          </div>
        </div>
        {naoLidas > 0 && (
          <button onClick={marcarTodas} className="text-xs text-blue-600 font-medium hover:underline">
            Marcar todas como lidas
          </button>
        )}
      </div>

      {/* Lista */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-slate-300" />
        </div>
      ) : notifs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
          <div className="p-4 rounded-2xl bg-slate-100">
            <Bell className="h-8 w-8 text-slate-300" />
          </div>
          <p className="text-slate-500 text-sm">Nenhuma notificação por enquanto.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifs.map((n) => {
            const lida    = lidas.has(n.id)
            const cfg     = ICON[n.tipo]
            const Icon    = cfg.icon
            return (
              <button
                key={n.id}
                onClick={() => { marcarLida(n.id); router.push(n.href) }}
                className={cn(
                  'w-full flex items-start gap-3 p-4 rounded-2xl border text-left transition-all active:scale-[0.98]',
                  lida
                    ? 'bg-white border-border opacity-60'
                    : 'bg-white border-border hover:border-slate-300 hover:shadow-sm',
                )}
              >
                <div className={cn('p-2 rounded-xl shrink-0', cfg.bg)}>
                  <Icon className={cn('h-4 w-4', cfg.color)} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className={cn('text-sm font-semibold', lida ? 'text-slate-400' : 'text-slate-800')}>
                      {n.titulo}
                    </p>
                    <span className="text-[10px] text-slate-400 whitespace-nowrap shrink-0">{n.tempo}</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5 truncate">{n.descricao}</p>
                </div>
                {!lida && (
                  <div className="w-2 h-2 rounded-full bg-blue-500 shrink-0 mt-1.5" />
                )}
              </button>
            )
          })}
        </div>
      )}

      {notifs.length > 0 && (
        <p className="text-center text-xs text-slate-400 pt-2">
          Mostrando matches das últimas 48h e visitas agendadas
        </p>
      )}
    </div>
  )
}
