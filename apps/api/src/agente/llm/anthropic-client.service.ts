import { Injectable } from '@nestjs/common'
import { ClienteLlm, EntradaGeracao, ErroLlm, prepararHistorico, requisitarProvedor } from './llm-client'

const URL_MESSAGES = 'https://api.anthropic.com/v1/messages'
const VERSAO_API = '2023-06-01'
const MAX_TOKENS_RESPOSTA = 1024

// Junta os blocos de texto da resposta da Messages API.
export function extrairTextoAnthropic(corpo: unknown): string | null {
  const blocos = (corpo as { content?: Array<{ type?: string; text?: string }> })?.content
  if (!Array.isArray(blocos)) return null
  const texto = blocos
    .filter((b) => b.type === 'text' && typeof b.text === 'string')
    .map((b) => b.text)
    .join('')
    .trim()
  return texto || null
}

@Injectable()
export class AnthropicClientService implements ClienteLlm {
  async gerar(entrada: EntradaGeracao): Promise<string> {
    const corpo = await requisitarProvedor(URL_MESSAGES, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': entrada.apiKey,
        'anthropic-version': VERSAO_API,
      },
      body: JSON.stringify({
        model: entrada.modelo,
        max_tokens: MAX_TOKENS_RESPOSTA,
        system: entrada.sistema,
        messages: prepararHistorico(entrada.mensagens).map((m) => ({ role: m.papel, content: m.texto })),
      }),
    })

    const texto = extrairTextoAnthropic(corpo)
    if (!texto) throw new ErroLlm('O provedor de IA devolveu uma resposta vazia.', null, false)
    return texto
  }
}
