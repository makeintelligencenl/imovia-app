// Chamadas da tela de conversas. Sem cache: a tela atualiza por polling, então cada leitura vai à API.
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1'

export type Conversa = {
  id: string
  telefone: string
  nomeContato: string | null
  humanTalk: boolean
  assumidoPorId: string | null
  resolvido: boolean
  esperandoDesde: string | null
  ultimaMensagemClienteEm: string | null
  unreadCount: number
  atualizadaEm: string
}

export type Mensagem = {
  id: string
  direcao: 'ENTRADA' | 'SAIDA'
  remetente: string
  tipo: string
  texto: string | null
  midiaStoragePath: string | null
  midiaUrl: string | null
  status: string | null
  statusMotivo: string | null
  transcricao: string | null
  criadaEm: string
}

export type ContatoCliente = {
  id: string
  nome: string
  email: string | null
  telefone: string | null
  whatsapp: string | null
} | null

export type Contagens = { naoLidas: number; esperando: number }

export class ConversasApiError extends Error {}

function token(): string | null {
  return typeof window !== 'undefined' ? sessionStorage.getItem('auth_token') : null
}

async function requisitar<T>(metodo: string, caminho: string, corpo?: unknown): Promise<T> {
  const t = token()
  const res = await fetch(`${API_BASE}${caminho}`, {
    method: metodo,
    credentials: 'include',
    headers: {
      ...(corpo !== undefined && !(corpo instanceof FormData) ? { 'Content-Type': 'application/json' } : {}),
      ...(t ? { Authorization: `Bearer ${t}` } : {}),
    },
    body: corpo === undefined ? undefined : corpo instanceof FormData ? corpo : JSON.stringify(corpo),
  })
  const texto = await res.text()
  if (!res.ok) {
    let mensagem = texto || `Erro ${res.status}`
    try {
      const dados = JSON.parse(texto) as { message?: unknown }
      if (typeof dados.message === 'string') mensagem = dados.message
    } catch {
      // corpo não é JSON
    }
    throw new ConversasApiError(mensagem)
  }
  return (texto.trim() === '' ? null : JSON.parse(texto)) as T
}

export const listarConversas = () => requisitar<Conversa[]>('GET', '/conversas')
export const contagens = () => requisitar<Contagens>('GET', '/conversas/contagens')
export const listarMensagens = (id: string) => requisitar<Mensagem[]>('GET', `/conversas/${id}/mensagens`)
export const enviarTexto = (id: string, texto: string) =>
  requisitar<{ enviada: true }>('POST', `/conversas/${id}/mensagens`, { texto })
export const enviarArquivo = (id: string, arquivo: File, legenda?: string) => {
  const form = new FormData()
  form.append('arquivo', arquivo)
  if (legenda) form.append('legenda', legenda)
  return requisitar<{ enviada: true }>('POST', `/conversas/${id}/midia`, form)
}
export const assumir = (id: string) => requisitar<Conversa>('POST', `/conversas/${id}/assumir`)
export const resolver = (id: string) => requisitar<Conversa>('POST', `/conversas/${id}/resolver`)
export const contatoDaConversa = (id: string) => requisitar<ContatoCliente>('GET', `/conversas/${id}/contato`)
export const criarClienteDaConversa = (id: string, nome: string) =>
  requisitar<NonNullable<ContatoCliente>>('POST', `/conversas/${id}/cliente`, { nome })
export const iniciarComTemplate = (dados: { telefone: string; template: string; idioma: string; parametros?: string[] }) =>
  requisitar<{ conversaId: string }>('POST', '/conversas/iniciar', dados)
export type TemplateWhatsapp = {
  name: string
  status: string
  language: string
  corpo: string | null
  variaveis: string[]
}

export const listarTemplates = () => requisitar<TemplateWhatsapp[]>('GET', '/whatsapp/templates')

// Dentro da janela de 24 horas o texto livre é permitido; depois, só template.
export function dentroDaJanela(ultimaMensagemClienteEm: string | null): boolean {
  if (!ultimaMensagemClienteEm) return false
  return Date.now() - new Date(ultimaMensagemClienteEm).getTime() < 24 * 60 * 60 * 1000
}
