export interface CurrentUser {
  id: string
  name: string
  email: string
  role: 'ADMIN' | 'CORRETOR'
  tenantId: string
}

export function getCurrentUser(): CurrentUser | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = sessionStorage.getItem('user')
    return raw ? (JSON.parse(raw) as CurrentUser) : null
  } catch {
    return null
  }
}

export function isAdmin(): boolean {
  return getCurrentUser()?.role === 'ADMIN'
}

export function isCorretor(): boolean {
  return getCurrentUser()?.role === 'CORRETOR'
}
