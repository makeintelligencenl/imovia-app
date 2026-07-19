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

function redirectToLogin(reason: 'expired' | 'unauthorized' = 'expired') {
  clearSession()
  if (typeof window !== 'undefined') {
    window.location.href = `/login?expired=1&reason=${encodeURIComponent(reason)}`
  }
}

// Tenta renovar o access_token usando o refresh_token (HttpOnly cookie).
// Retorna true se conseguiu, false se o refresh_token também expirou.
let _refreshing: Promise<boolean> | null = null
async function tryRefresh(): Promise<boolean> {
  if (_refreshing) return _refreshing
  _refreshing = fetch(`${API_BASE}/auth/refresh`, {
    method: 'POST',
    credentials: 'include',
  })
    .then((r) => r.ok)
    .catch(() => false)
    .finally(() => { _refreshing = null })
  return _refreshing
}

export async function apiRequest<T>(method: string, path: string, body?: unknown): Promise<T> {
  if (isSessionExpired()) {
    redirectToLogin('expired')
    throw new Error('Sessão expirada')
  }

  if (method === 'GET') {
    const cached = getCached<T>(path)
    if (cached !== null) return cached
  }

  if (method !== 'GET') {
    const resource = '/' + path.replace(/^\//, '').split(/[/?]/)[0]
    const CASCADE: Record<string, string[]> = {
      '/imoveis':   ['/imoveis', '/matches'],
      '/perfis':    ['/perfis',  '/matches'],
      '/clientes':  ['/clientes', '/perfis'],
      '/matches':   ['/matches'],
      '/visitas':   ['/visitas'],
      '/pipeline':  ['/pipeline', '/matches'],
      '/users':     ['/users'],
      '/auth':      [],
    }
    const toInvalidate = CASCADE[resource] ?? [resource]
    toInvalidate.forEach(r => invalidateCache(r))
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })

  // access_token expirado → tenta renovar silenciosamente e retry uma vez
  if (res.status === 401) {
    const refreshed = await tryRefresh()
    if (!refreshed) {
      redirectToLogin('unauthorized')
      throw new Error('Não autorizado')
    }
    // Retry com o novo access_token (cookie já foi setado pelo /auth/refresh)
    const retry = await fetch(`${API_BASE}${path}`, {
      method,
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    })
    if (!retry.ok) {
      if (retry.status === 401) redirectToLogin('unauthorized')
      throw new Error(`HTTP ${retry.status}`)
    }
    const retryData = (await retry.json()) as T
    if (method === 'GET') setCached(path, retryData)
    return retryData
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
  put:    <T>(path: string, body: unknown)   => apiRequest<T>('PUT',    path, body),
  patch:  <T>(path: string, body: unknown)   => apiRequest<T>('PATCH',  path, body),
  delete: <T>(path: string)                  => apiRequest<T>('DELETE', path),
}
