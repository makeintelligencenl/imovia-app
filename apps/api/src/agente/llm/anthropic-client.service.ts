import { Injectable } from '@nestjs/common'
import {
  ClienteLlm,
  EntradaComFerramentas,
  EntradaGeracao,
  ErroLlm,
  ExecutorFerramenta,
  MAX_RODADAS_FERRAMENTAS,
  prepararHistorico,
  requisitarProvedor,
} from './llm-client'

const URL_MESSAGES = 'https://api.anthropic.com/v1/messages'
const VERSAO_API = '2023-06-01'
const MAX_TOKENS_RESPOSTA = 1024

type BlocoAnthropic = { type?: string; id?: string; name?: string; input?: unknown; text?: string }

// Junta os blocos de texto da resposta da Messages API.
export function extrairTextoAnthropic(corpo: unknown): string | null {
  const blocos = (corpo as { content?: BlocoAnthropic[] })?.content
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
    return this.gerarComFerramentas({ ...entrada, ferramentas: [] }, async () => '')
  }

  async gerarComFerramentas(entrada: EntradaComFerramentas, executor: ExecutorFerramenta): Promise<string> {
    const mensagens: unknown[] = prepararHistorico(entrada.mensagens).map((m) => ({ role: m.papel, content: m.texto }))
    const ferramentas = entrada.ferramentas.map((f) => ({
      name: f.nome,
      description: f.descricao,
      input_schema: f.esquema,
    }))

    for (let rodada = 0; rodada < MAX_RODADAS_FERRAMENTAS; rodada++) {
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
          messages: mensagens,
          ...(ferramentas.length > 0 ? { tools: ferramentas } : {}),
        }),
      })

      const blocos = ((corpo as { content?: BlocoAnthropic[] })?.content ?? []) as BlocoAnthropic[]
      const chamadas = blocos.filter((b) => b.type === 'tool_use' && b.id && b.name)

      if (chamadas.length === 0) {
        const texto = extrairTextoAnthropic(corpo)
        if (!texto) throw new ErroLlm('O provedor de IA devolveu uma resposta vazia.', null, false)
        return texto
      }

      mensagens.push({ role: 'assistant', content: blocos })
      const resultados = []
      for (const c of chamadas) {
        const conteudo = await executor({ id: c.id!, nome: c.name!, argumentos: (c.input ?? {}) as Record<string, unknown> })
        resultados.push({ type: 'tool_result', tool_use_id: c.id, content: conteudo })
      }
      mensagens.push({ role: 'user', content: resultados })
    }

    throw new ErroLlm('O agente usou ferramentas demais nesta resposta.', null, false)
  }
}
