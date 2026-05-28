import { isSessionExpired, clearSession } from './session'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1'

function getToken() {
  if (typeof window === 'undefined') return ''
  return sessionStorage.getItem('token') || ''
}

/** Redireciona para login sinalizando sessão expirada */
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

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getToken()}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  // Token inválido / revogado pelo servidor
  if (res.status === 401) {
    redirectToLogin('unauthorized')
    throw new Error('Não autorizado')
  }

  if (!res.ok) {
    const err = await res.text()
    throw new Error(err || `HTTP ${res.status}`)
  }

  return res.json()
}

export const api = {
  get:    <T>(path: string)                  => apiRequest<T>('GET',    path),
  post:   <T>(path: string, body: unknown)   => apiRequest<T>('POST',   path, body),
  patch:  <T>(path: string, body: unknown)   => apiRequest<T>('PATCH',  path, body),
  delete: <T>(path: string)                  => apiRequest<T>('DELETE', path),
}
