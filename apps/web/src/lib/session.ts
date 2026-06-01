/**
 * Gerenciamento de sessão com timeout por inatividade.
 *
 * Configuração via variável de ambiente:
 *   NEXT_PUBLIC_SESSION_TIMEOUT_MINUTES (padrão: 15)
 *
 * S1 FIX: O token JWT não é mais armazenado no sessionStorage.
 * Ele vive exclusivamente em um HttpOnly cookie gerenciado pelo browser,
 * inacessível ao JavaScript (proteção contra XSS).
 * O sessionStorage guarda apenas dados não-sensíveis do usuário (id, name, role).
 *
 * A última atividade fica no localStorage para sobreviver a navegações de página.
 */

const ACTIVITY_KEY = 'imovia_last_activity'
const API_BASE     = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1'

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

  // S1 FIX: verifica pelo dado de usuário no sessionStorage em vez do token
  // (o token não é mais acessível ao JS — vive no HttpOnly cookie)
  const user = sessionStorage.getItem('user')
  if (!user) return false

  const last = localStorage.getItem(ACTIVITY_KEY)
  // Se não há registro de atividade, considera sessão válida (login recente)
  if (!last) return false

  return Date.now() - Number(last) > getTimeoutMs()
}

/**
 * Encerra a sessão: limpa dados locais e pede ao servidor que expire o cookie.
 * Fire-and-forget no logout — mesmo se falhar, dados locais já foram limpos.
 */
export function clearSession(): void {
  if (typeof window === 'undefined') return
  sessionStorage.removeItem('user')
  localStorage.removeItem(ACTIVITY_KEY)

  // S1 FIX: chama /auth/logout para que o servidor faça clearCookie do HttpOnly cookie.
  // O browser sozinho não consegue apagar um HttpOnly cookie via JavaScript.
  fetch(`${API_BASE}/auth/logout`, {
    method:      'POST',
    credentials: 'include',
  }).catch(() => { /* silencioso — sessão local já foi limpa */ })
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
