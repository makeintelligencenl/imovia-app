import { Injectable } from '@nestjs/common'
import { ClienteLlm, EntradaGeracao, ErroLlm, prepararHistorico, requisitarProvedor } from './llm-client'

// Modelos GPT-6 usam a Responses API por padrão (ver documentação da OpenAI).
const URL_RESPONSES = 'https://api.openai.com/v1/responses'
const MAX_TOKENS_RESPOSTA = 1024

// Lê o texto da resposta da Responses API (campo de conveniência ou blocos de saída).
export function extrairTextoOpenAi(corpo: unknown): string | null {
  const c = corpo as {
    output_text?: unknown
    output?: Array<{ content?: Array<{ type?: string; text?: string }> }>
  }
  if (typeof c?.output_text === 'string' && c.output_text.trim()) return c.output_text.trim()

  const texto = (c?.output ?? [])
    .flatMap((item) => item.content ?? [])
    .filter((b) => b.type === 'output_text' && typeof b.text === 'string')
    .map((b) => b.text)
    .join('')
    .trim()
  return texto || null
}

@Injectable()
export class OpenAiClientService implements ClienteLlm {
  async gerar(entrada: EntradaGeracao): Promise<string> {
    const corpo = await requisitarProvedor(URL_RESPONSES, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${entrada.apiKey}`,
      },
      body: JSON.stringify({
        model: entrada.modelo,
        instructions: entrada.sistema,
        input: prepararHistorico(entrada.mensagens).map((m) => ({ role: m.papel, content: m.texto })),
        max_output_tokens: MAX_TOKENS_RESPOSTA,
      }),
    })

    const texto = extrairTextoOpenAi(corpo)
    if (!texto) throw new ErroLlm('O provedor de IA devolveu uma resposta vazia.', null, false)
    return texto
  }
}
