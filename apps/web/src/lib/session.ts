/**
 * Gerenciamento de sessão com timeout por inatividade.
 *
 * Configuração via variável de ambiente:
 *   NEXT_PUBLIC_SESSION_TIMEOUT_MINUTES (padrão: 15)
 *
 * A última atividade do usuário é armazenada em localStorage para
 * sobreviver a navegações de página. O token JWT fica no sessionStorage
 * (apagado ao fechar o browser).
 */

const ACTIVITY_KEY = 'imovia_last_activity'

/** Timeout em milissegundos (lê a variável de ambiente ou usa 15 min) */
export function getTimeoutMs(): number {
  const minutes = Number(process.env.NEXT_PUBLIC_SESSION_TIMEOUT_MINUTES) || 15
  return minutes * 60 * 1000
}

/** Registra o timestamp da última atividade do usuário */
export function updateLastActivity(): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(ACTIVITY_KEY, Date.now().toString())
}

/** Retorna true se a sessão expirou por inatividade */
export function isSessionExpired(): boolean {
  if (typeof window === 'undefined') return false

  // Sem token = não está logado (não é "expirado")
  const token = sessionStorage.getItem('token')
  if (!token) return false

  const last = localStorage.getItem(ACTIVITY_KEY)
  // Se não há registro de atividade, considera sessão válida (login recente)
  if (!last) return false

  return Date.now() - Number(last) > getTimeoutMs()
}

/** Remove token, dados de usuário e registro de atividade */
export function clearSession(): void {
  if (typeof window === 'undefined') return
  sessionStorage.removeItem('token')
  sessionStorage.removeItem('user')
  localStorage.removeItem(ACTIVITY_KEY)
}

/** Retorna quantos minutos restam antes do timeout (0 se já expirou) */
export function minutesRemaining(): number {
  if (typeof window === 'undefined') return 0
  const last = localStorage.getItem(ACTIVITY_KEY)
  if (!last) return getTimeoutMs() / 60_000
  const elapsed = Date.now() - Number(last)
  const remaining = getTimeoutMs() - elapsed
  return Math.max(0, Math.ceil(remaining / 60_000))
}
