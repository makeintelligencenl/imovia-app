// Chamadas à API do WhatsApp. Usa um fetch próprio (e não o apiRequest) porque a API responde 200
// com corpo vazio quando não há conexão salva, e o apiRequest tenta ler JSON e quebraria.

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1'

export type ConfiguracaoWhatsapp = {
  id: string
  phoneNumberId: string
  businessAccountId: string
  accessTokenMascarado: string
  atualizadoEm: string
}

export class WhatsappApiError extends Error {}

async function requisitar<T>(method: string, path: string, body?: unknown): Promise<T | null> {
  const token = typeof window !== 'undefined' ? sessionStorage.getItem('auth_token') : null
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  if (!res.ok) {
    const texto = await res.text()
    let mensagem = texto || `Erro ${res.status}`
    try {
      const corpo = JSON.parse(texto) as { message?: unknown }
      if (typeof corpo.message === 'string') mensagem = corpo.message
    } catch {
      // corpo não é JSON: mantém o texto original
    }
    throw new WhatsappApiError(mensagem)
  }

  const texto = await res.text()
  return texto.trim() === '' ? null : (JSON.parse(texto) as T)
}

export function buscarConfiguracaoWhatsapp(): Promise<ConfiguracaoWhatsapp | null> {
  return requisitar<ConfiguracaoWhatsapp>('GET', '/whatsapp/configuracao')
}

export function conectarWhatsappPorEmbeddedSignup(dados: {
  codigo: string
  businessAccountId?: string
  phoneNumberId?: string
}): Promise<ConfiguracaoWhatsapp> {
  return requisitar<ConfiguracaoWhatsapp>('POST', '/whatsapp/conectar', dados) as Promise<ConfiguracaoWhatsapp>
}

export async function desconectarWhatsapp(): Promise<void> {
  await requisitar('DELETE', '/whatsapp/configuracao')
}
