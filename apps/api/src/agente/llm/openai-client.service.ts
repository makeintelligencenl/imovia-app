import { Injectable } from '@nestjs/common'
import {
  ClienteLlm,
  EntradaComFerramentas,
  EntradaGeracao,
  ErroLlm,
  ExecutorFerramenta,
  lerArgumentos,
  MAX_RODADAS_FERRAMENTAS,
  prepararHistorico,
  requisitarProvedor,
} from './llm-client'

// Modelos GPT-6 usam a Responses API por padrão (ver documentação da OpenAI).
const URL_RESPONSES = 'https://api.openai.com/v1/responses'
const MAX_TOKENS_RESPOSTA = 1024

type ItemOpenAi = {
  type?: string
  content?: Array<{ type?: string; text?: string }>
  call_id?: string
  name?: string
  arguments?: unknown
}

// Lê o texto da resposta da Responses API (campo de conveniência ou blocos de saída).
export function extrairTextoOpenAi(corpo: unknown): string | null {
  const c = corpo as { output_text?: unknown; output?: ItemOpenAi[] }
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
    return this.gerarComFerramentas({ ...entrada, ferramentas: [] }, async () => '')
  }

  async gerarComFerramentas(entrada: EntradaComFerramentas, executor: ExecutorFerramenta): Promise<string> {
    const entradaModelo: unknown[] = prepararHistorico(entrada.mensagens).map((m) => ({
      role: m.papel,
      content: m.texto,
    }))
    const ferramentas = entrada.ferramentas.map((f) => ({
      type: 'function',
      name: f.nome,
      description: f.descricao,
      parameters: f.esquema,
    }))

    for (let rodada = 0; rodada < MAX_RODADAS_FERRAMENTAS; rodada++) {
      const corpo = await requisitarProvedor(URL_RESPONSES, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${entrada.apiKey}`,
        },
        body: JSON.stringify({
          model: entrada.modelo,
          instructions: entrada.sistema,
          input: entradaModelo,
          max_output_tokens: MAX_TOKENS_RESPOSTA,
          ...(ferramentas.length > 0 ? { tools: ferramentas } : {}),
        }),
      })

      const chamadas = ((corpo as { output?: ItemOpenAi[] })?.output ?? []).filter(
        (item) => item.type === 'function_call' && item.call_id && item.name,
      )

      if (chamadas.length === 0) {
        const texto = extrairTextoOpenAi(corpo)
        if (!texto) throw new ErroLlm('O provedor de IA devolveu uma resposta vazia.', null, false)
        return texto
      }

      // Devolve as próprias chamadas ao modelo, seguidas dos resultados.
      entradaModelo.push(...chamadas)
      for (const c of chamadas) {
        const conteudo = await executor({
          id: c.call_id!,
          nome: c.name!,
          argumentos: lerArgumentos(c.arguments),
        })
        entradaModelo.push({ type: 'function_call_output', call_id: c.call_id, output: conteudo })
      }
    }

    throw new ErroLlm('O agente usou ferramentas demais nesta resposta.', null, false)
  }
}
