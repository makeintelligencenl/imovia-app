import { ErroLlm } from '../agente/llm/llm-client'
import { DIMENSOES_EMBEDDING, EmbeddingsOpenAiService, extrairEmbeddings } from './embeddings-openai.service'

const vetor = () => Array.from({ length: DIMENSOES_EMBEDDING }, (_, i) => i / DIMENSOES_EMBEDDING)

describe('extrairEmbeddings', () => {
  it('reordena pelo índice devolvido pela API', () => {
    const a = vetor()
    const b = vetor().map((x) => x + 1)
    const resultado = extrairEmbeddings(
      { data: [{ index: 1, embedding: b }, { index: 0, embedding: a }] },
      2,
    )
    expect(resultado[0]).toEqual(a)
    expect(resultado[1]).toEqual(b)
  })

  it('rejeita dimensão diferente da esperada', () => {
    expect(() => extrairEmbeddings({ data: [{ index: 0, embedding: [0.1, 0.2] }] }, 1)).toThrow(ErroLlm)
  })

  it('rejeita resposta sem a lista de dados', () => {
    expect(() => extrairEmbeddings({}, 1)).toThrow(ErroLlm)
  })
})

describe('EmbeddingsOpenAiService.gerar', () => {
  const fetchOriginal = global.fetch
  afterEach(() => {
    global.fetch = fetchOriginal
  })

  it('envia o modelo e a chave e devolve um vetor por texto', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ data: [{ index: 0, embedding: vetor() }] }),
    } as unknown as Response)

    const vetores = await new EmbeddingsOpenAiService().gerar(['um trecho'], 'sk-chave-1234')
    expect(vetores).toHaveLength(1)

    const [url, init] = (global.fetch as jest.Mock).mock.calls[0]
    expect(url).toBe('https://api.openai.com/v1/embeddings')
    expect(init.headers.authorization).toBe('Bearer sk-chave-1234')
    expect(JSON.parse(init.body)).toMatchObject({ model: 'text-embedding-3-small', input: ['um trecho'] })
  })
})
