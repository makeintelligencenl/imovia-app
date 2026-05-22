const API_BASE = process.env.CORRETOR_API_URL || 'http://localhost:3001/api/v1'
const API_KEY = process.env.CORRETOR_API_KEY || ''

export async function apiRequest<T>(
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${API_KEY}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`API ${method} ${path} falhou (${response.status}): ${error}`)
  }

  return response.json() as Promise<T>
}
