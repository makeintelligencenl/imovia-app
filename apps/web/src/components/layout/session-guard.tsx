'use client'
import { useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  updateLastActivity,
  isSessionExpired,
  clearSession,
  getTimeoutMs,
} from '@/lib/session'
import { api } from '@/lib/api'

/** Eventos de usuário que reiniciam o contador de inatividade */
const ACTIVITY_EVENTS = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click'] as const

/** Frequência de verificação (a cada 30 s está OK — expira só após 15 min de inatividade) */
const CHECK_INTERVAL_MS = 30_000

/**
 * Componente cliente que envolve o dashboard.
 * - Monitora eventos de atividade e reseta o timer a cada interação.
 * - Verifica a cada 30 s se o timeout foi atingido.
 * - Ao expirar, limpa a sessão e redireciona para /login?expired=1.
 * - Avisa o usuário com um toast 1 minuto antes de expirar.
 */
export function SessionGuard({ children }: { children: React.ReactNode }) {
  const router        = useRouter()
  const warnedRef     = useRef(false)   // evita repetir o aviso de 1 min

  const handleExpiry = useCallback(() => {
    clearSession()
    toast.error('Sessão expirada por inatividade. Faça login novamente.', { duration: 5000 })
    router.replace('/login?expired=1')
  }, [router])

  // ── Warmup: pré-busca os dados do dashboard para acordar a API e popular o cache ──
  useEffect(() => {
    // S1 FIX: usa 'user' em vez de 'token' (token agora vive em HttpOnly cookie)
    const user = typeof window !== 'undefined' ? sessionStorage.getItem('user') : null
    if (!user) return

    const now = new Date()
    const mes = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

    // Fire-and-forget — aquece o servidor e popula o cache com os endpoints
    // que o dashboard do corretor vai precisar imediatamente
    Promise.allSettled([
      api.get('/matches/dashboard-summary'),
      api.get(`/visitas?mes=${mes}`),
    ])
  }, []) // apenas uma vez no mount do dashboard

  useEffect(() => {
    // Registra atividade no momento do mount (login / reload)
    updateLastActivity()
    warnedRef.current = false

    // Handler: reseta o timer e cancela aviso pendente a cada interação
    const onActivity = () => {
      updateLastActivity()
      warnedRef.current = false
    }

    ACTIVITY_EVENTS.forEach((ev) =>
      window.addEventListener(ev, onActivity, { passive: true }),
    )

    // Verificação periódica
    const interval = setInterval(() => {
      if (typeof window === 'undefined') return

      // S1 FIX: verifica 'user' em vez de 'token' (token vive em HttpOnly cookie)
      const user = sessionStorage.getItem('user')
      if (!user) return   // não está logado, nada a fazer

      if (isSessionExpired()) {
        handleExpiry()
        return
      }

      // Aviso 1 minuto antes de expirar
      const timeoutMs     = getTimeoutMs()
      const last          = Number(localStorage.getItem('imovia_last_activity') ?? 0)
      const elapsed       = Date.now() - last
      const remaining     = timeoutMs - elapsed
      const ONE_MINUTE_MS = 60_000

      if (remaining > 0 && remaining <= ONE_MINUTE_MS && !warnedRef.current) {
        warnedRef.current = true
        toast.warning('Sua sessão expirará em 1 minuto por inatividade.', { duration: 8000 })
      }
    }, CHECK_INTERVAL_MS)

    return () => {
      ACTIVITY_EVENTS.forEach((ev) => window.removeEventListener(ev, onActivity))
      clearInterval(interval)
    }
  }, [handleExpiry])

  return <>{children}</>
}
