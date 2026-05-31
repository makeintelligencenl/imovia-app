import { isSessionExpired, clearSession } from './session'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1'

// ── Cache em memória para GET requests ────────────────────────────────────────
// Evita re-fetch ao navegar entre páginas. TTL de 2 min.
// Qualquer mutação (POST/PATCH/DELETE) limpa o cache automaticamente.
const _cache = new Map<string, { data: unknown; ts: number }>()
const CACHE_TTL_MS = 2 * 60 * 1000 // 2 minutos

function getCached<T>(path: string): T | null {
  const entry = _cache.get(path)
  if (!entry) return null
  if (Date.now() - entry.ts > CACHE_TTL_MS) { _cache.delete(path); return null }
  return entry.data as T
}

function setCached(path: string, data: unknown) {
  _cache.set(path, { data, ts: Date.now() })
}

/**
 * Invalida entradas do cache.
 * - Sem argumento → limpa tudo (chamado automaticamente em mutações)
 * - Com prefixo → remove apenas as entradas que começam com ele
 */
export function invalidateCache(prefix?: string) {
  if (!prefix) { _cache.clear(); return }
  for (const key of _cache.keys()) {
    if (key.startsWith(prefix)) _cache.delete(key)
  }
}

// ─────────────────────────────────────────────────────────────────────────────

function getToken() {
  if (typeof window === 'undefined') return ''
  return sessionStorage.getItem('token') || ''
}

function redirectToLogin(reason: 'expired' | 'unauthorized' = 'expired') {
  clearSession()
  if (typeof window !== 'undefined') {
    window.location.href = `/login?expired=1&reason=${reason}`
  }
}

export async function apiRequest<T>(method: string, path: string, body?: unknown): Promise<T> {
  // Verifica timeout por inatividade antes de disparar a requisição
  if (isSessionExpired()) {
    redirectToLogin('expired')
    throw new Error('Sessão expirada')
  }

  // ── Serve do cache em GETs frescos (evita round-trip desnecessário) ──
  if (method === 'GET') {
    const cached = getCached<T>(path)
    if (cached !== null) return cached
  }

  // ── BUG #7: Invalidação cirúrgica por recurso, não nuclear.
  // Antes: qualquer PATCH invalidava imóveis, matches, pipeline, etc.
  // Agora: PATCH /matches/123/etapa invalida apenas /matches (e cascades mapeados).
  if (method !== 'GET') {
    const resource = '/' + path.replace(/^\//, '').split(/[/?]/)[0]
    const CASCADE: Record<string, string[]> = {
      '/imoveis':   ['/imoveis', '/matches'],   // novo imóvel pode gerar matches
      '/perfis':    ['/perfis',  '/matches'],   // novo perfil pode gerar matches
      '/clientes':  ['/clientes', '/perfis'],
      '/matches':   ['/matches'],
      '/visitas':   ['/visitas'],
      '/pipeline':  ['/pipeline', '/matches'],
      '/users':     ['/users'],
      '/auth':      [],                          // login: não há cache a limpar
    }
    const toInvalidate = CASCADE[resource] ?? [resource]
    toInvalidate.forEach(r => invalidateCache(r))
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getToken()}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  if (res.status === 401) {
    redirectToLogin('unauthorized')
    throw new Error('Não autorizado')
  }

  if (!res.ok) {
    const err = await res.text()
    throw new Error(err || `HTTP ${res.status}`)
  }

  const data = (await res.json()) as T

  // Armazena no cache apenas GETs bem-sucedidos
  if (method === 'GET') {
    setCached(path, data)
  }

  return data
}

export const api = {
  get:    <T>(path: string)                  => apiRequest<T>('GET',    path),
  post:   <T>(path: string, body: unknown)   => apiRequest<T>('POST',   path, body),
  patch:  <T>(path: string, body: unknown)   => apiRequest<T>('PATCH',  path, body),
  delete: <T>(path: string)                  => apiRequest<T>('DELETE', path),
}
