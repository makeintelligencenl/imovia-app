import { Injectable } from '@nestjs/common'
import { ErroLlm, requisitarProvedor } from '../agente/llm/llm-client'

export const MODELO_EMBEDDING = 'text-embedding-3-small'
export const DIMENSOES_EMBEDDING = 1536
const URL_EMBEDDINGS = 'https://api.openai.com/v1/embeddings'
const LOTE_MAXIMO = 100

// Converte a lista de textos em vetores, na mesma ordem. A API devolve com um índice; usamos ele.
export function extrairEmbeddings(corpo: unknown, quantidade: number): number[][] {
  const dados = (corpo as { data?: Array<{ index?: number; embedding?: number[] }> })?.data
  if (!Array.isArray(dados)) throw new ErroLlm('Resposta inválida ao gerar embeddings.', null, false)

  const vetores: number[][] = new Array(quantidade)
  for (const item of dados) {
    if (typeof item.index !== 'number' || !Array.isArray(item.embedding)) {
      throw new ErroLlm('Resposta inválida ao gerar embeddings.', null, false)
    }
    vetores[item.index] = item.embedding
  }
  if (vetores.some((v) => !v || v.length !== DIMENSOES_EMBEDDING)) {
    throw new ErroLlm('Embedding com dimensão inesperada.', null, false)
  }
  return vetores
}

@Injectable()
export class EmbeddingsOpenAiService {
  async gerar(textos: string[], apiKey: string): Promise<number[][]> {
    const resultado: number[][] = []
    for (let i = 0; i < textos.length; i += LOTE_MAXIMO) {
      const lote = textos.slice(i, i + LOTE_MAXIMO)
      const corpo = await requisitarProvedor(URL_EMBEDDINGS, {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({ model: MODELO_EMBEDDING, input: lote }),
      })
      resultado.push(...extrairEmbeddings(corpo, lote.length))
    }
    return resultado
  }
}
