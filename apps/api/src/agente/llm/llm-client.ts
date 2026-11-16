// Tipos e utilitários comuns aos clientes de LLM (Anthropic e OpenAI).

export type PapelMensagem = 'user' | 'assistant'

export type MensagemLlm = { papel: PapelMensagem; texto: string }

export type EntradaGeracao = {
  modelo: string
  apiKey: string
  sistema: string
  mensagens: MensagemLlm[]
}

// Ferramenta que o modelo pode chamar. O esquema segue JSON Schema.
export type FerramentaLlm = {
  nome: string
  descricao: string
  esquema: Record<string, unknown>
}

export type ChamadaFerramenta = {
  id: string
  nome: string
  argumentos: Record<string, unknown>
}

// Devolve o texto do resultado, que volta ao modelo. Não deve lançar erro por regra de negócio.
export type ExecutorFerramenta = (chamada: ChamadaFerramenta) => Promise<string>

export type EntradaComFerramentas = EntradaGeracao & { ferramentas: FerramentaLlm[] }

// Limite de rodadas de chamadas de ferramenta por resposta (evita laço infinito).
export const MAX_RODADAS_FERRAMENTAS = 4

export interface ClienteLlm {
  gerar(entrada: EntradaGeracao): Promise<string>
  gerarComFerramentas(entrada: EntradaComFerramentas, executor: ExecutorFerramenta): Promise<string>
}

// Argumentos chegam como texto JSON na OpenAI. Texto inválido vira objeto vazio.
export function lerArgumentos(bruto: unknown): Record<string, unknown> {
  if (typeof bruto === 'object' && bruto !== null) return bruto as Record<string, unknown>
  if (typeof bruto !== 'string' || !bruto.trim()) return {}
  try {
    const valor = JSON.parse(bruto)
    return typeof valor === 'object' && valor !== null ? (valor as Record<string, unknown>) : {}
  } catch {
    return {}
  }
}

export const TIMEOUT_GERACAO_MS = 25_000

export class ErroLlm extends Error {
  constructor(
    mensagem: string,
    readonly status: number | null,
    readonly tentavel: boolean,
  ) {
    super(mensagem)
    this.name = 'ErroLlm'
  }
}

// Só vale repetir: limite de uso (429) e falhas do servidor (5xx).
export function statusTentavel(status: number): boolean {
  return status === 429 || status >= 500
}

export function mensagemAmigavel(status: number | null): string {
  if (status === null) return 'Não foi possível falar com o provedor de IA. Tente novamente.'
  if (status === 401 || status === 403) return 'A chave do provedor de IA é inválida ou não tem permissão.'
  if (status === 404) return 'O modelo escolhido não existe mais no provedor de IA.'
  if (status === 429) return 'O provedor de IA recusou por limite de uso. Tente de novo em instantes.'
  if (status >= 500) return 'O provedor de IA está indisponível no momento.'
  return `O provedor de IA respondeu com erro (${status}).`
}

// Faz a chamada HTTP e converte falhas em ErroLlm. Timeout e erro de rede são tentáveis.
export async function requisitarProvedor(url: string, init: RequestInit): Promise<unknown> {
  let res: Response
  try {
    res = await fetch(url, { ...init, signal: AbortSignal.timeout(TIMEOUT_GERACAO_MS) })
  } catch {
    throw new ErroLlm(mensagemAmigavel(null), null, true)
  }

  if (!res.ok) {
    throw new ErroLlm(mensagemAmigavel(res.status), res.status, statusTentavel(res.status))
  }

  try {
    return await res.json()
  } catch {
    throw new ErroLlm('Resposta inválida do provedor de IA.', res.status, false)
  }
}

// Uma nova tentativa, após uma pausa, só para erros tentáveis.
export async function comNovaTentativa<T>(fn: () => Promise<T>, esperaMs = 1000): Promise<T> {
  try {
    return await fn()
  } catch (erro) {
    if (!(erro instanceof ErroLlm) || !erro.tentavel) throw erro
    await new Promise((resolve) => setTimeout(resolve, esperaMs))
    return fn()
  }
}

// Provedores exigem histórico que começa com o cliente e alterna papéis.
// Remove respostas do agente no início e une mensagens seguidas do mesmo papel.
export function prepararHistorico(mensagens: MensagemLlm[]): MensagemLlm[] {
  const semInicioAgente = [...mensagens]
  while (semInicioAgente.length > 0 && semInicioAgente[0].papel === 'assistant') semInicioAgente.shift()

  const unidas: MensagemLlm[] = []
  for (const m of semInicioAgente) {
    const ultima = unidas[unidas.length - 1]
    if (ultima && ultima.papel === m.papel) {
      ultima.texto = `${ultima.texto}\n${m.texto}`
    } else {
      unidas.push({ ...m })
    }
  }
  return unidas
}
