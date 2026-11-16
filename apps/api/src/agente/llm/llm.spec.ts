import { ErroLlm, comNovaTentativa, mensagemAmigavel, prepararHistorico, statusTentavel } from './llm-client'
import { AnthropicClientService, extrairTextoAnthropic } from './anthropic-client.service'
import { OpenAiClientService, extrairTextoOpenAi } from './openai-client.service'

function respostaHttp(status: number, corpo: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => corpo,
  } as unknown as Response
}

const entrada = {
  modelo: 'modelo-x',
  apiKey: 'sk-teste-1234',
  sistema: 'Você é o atendente.',
  mensagens: [{ papel: 'user' as const, texto: 'Oi' }],
}

describe('erros do provedor', () => {
  it('só repete 429 e 5xx', () => {
    expect(statusTentavel(429)).toBe(true)
    expect(statusTentavel(503)).toBe(true)
    expect(statusTentavel(400)).toBe(false)
    expect(statusTentavel(401)).toBe(false)
    expect(statusTentavel(404)).toBe(false)
  })

  it('traduz status em mensagem amigável sem dados sensíveis', () => {
    expect(mensagemAmigavel(401)).toContain('chave')
    expect(mensagemAmigavel(404)).toContain('modelo')
    expect(mensagemAmigavel(null)).toContain('Não foi possível')
  })

  it('repete uma vez quando o erro é tentável e para quando não é', async () => {
    const tentavel = jest
      .fn()
      .mockRejectedValueOnce(new ErroLlm('x', 500, true))
      .mockResolvedValueOnce('ok')
    await expect(comNovaTentativa(tentavel, 0)).resolves.toBe('ok')
    expect(tentavel).toHaveBeenCalledTimes(2)

    const nao = jest.fn().mockRejectedValue(new ErroLlm('x', 401, false))
    await expect(comNovaTentativa(nao, 0)).rejects.toBeInstanceOf(ErroLlm)
    expect(nao).toHaveBeenCalledTimes(1)
  })
})

describe('prepararHistorico', () => {
  it('remove respostas do agente no início e une mensagens seguidas do mesmo papel', () => {
    const historico = prepararHistorico([
      { papel: 'assistant', texto: 'Olá!' },
      { papel: 'user', texto: 'Quero um apartamento' },
      { papel: 'user', texto: 'Em Belo Horizonte' },
      { papel: 'assistant', texto: 'Quantos quartos?' },
    ])
    expect(historico).toEqual([
      { papel: 'user', texto: 'Quero um apartamento\nEm Belo Horizonte' },
      { papel: 'assistant', texto: 'Quantos quartos?' },
    ])
  })
})

describe('extração de texto', () => {
  it('Anthropic: junta blocos de texto da resposta', () => {
    expect(extrairTextoAnthropic({ content: [{ type: 'text', text: 'Olá' }, { type: 'text', text: '!' }] })).toBe('Olá!')
    expect(extrairTextoAnthropic({ content: [] })).toBeNull()
  })

  it('OpenAI: usa output_text ou os blocos de saída', () => {
    expect(extrairTextoOpenAi({ output_text: ' Oi ' })).toBe('Oi')
    expect(
      extrairTextoOpenAi({ output: [{ content: [{ type: 'output_text', text: 'Oi de novo' }] }] }),
    ).toBe('Oi de novo')
    expect(extrairTextoOpenAi({ output: [] })).toBeNull()
  })
})

describe('clientes de LLM (fetch simulado)', () => {
  const fetchOriginal = global.fetch
  afterEach(() => {
    global.fetch = fetchOriginal
  })

  it('Anthropic: envia cabeçalhos e devolve o texto', async () => {
    global.fetch = jest.fn().mockResolvedValue(respostaHttp(200, { content: [{ type: 'text', text: 'Resposta' }] }))
    const texto = await new AnthropicClientService().gerar(entrada)
    expect(texto).toBe('Resposta')
    const [url, init] = (global.fetch as jest.Mock).mock.calls[0]
    expect(url).toBe('https://api.anthropic.com/v1/messages')
    expect(init.headers['x-api-key']).toBe('sk-teste-1234')
    expect(init.headers['anthropic-version']).toBe('2023-06-01')
  })

  it('OpenAI: envia Bearer e devolve o texto', async () => {
    global.fetch = jest.fn().mockResolvedValue(respostaHttp(200, { output_text: 'Pronto' }))
    const texto = await new OpenAiClientService().gerar(entrada)
    expect(texto).toBe('Pronto')
    const [url, init] = (global.fetch as jest.Mock).mock.calls[0]
    expect(url).toBe('https://api.openai.com/v1/responses')
    expect(init.headers.authorization).toBe('Bearer sk-teste-1234')
  })

  it('erro 401 vira ErroLlm não tentável, sem a chave na mensagem', async () => {
    global.fetch = jest.fn().mockResolvedValue(respostaHttp(401, { error: 'invalid key sk-teste-1234' }))
    const erro = await new AnthropicClientService().gerar(entrada).catch((e) => e)
    expect(erro).toBeInstanceOf(ErroLlm)
    expect(erro.tentavel).toBe(false)
    expect(erro.message).not.toContain('sk-teste')
  })

  it('falha de rede é tentável', async () => {
    global.fetch = jest.fn().mockRejectedValue(new TypeError('fetch failed'))
    const erro = await new OpenAiClientService().gerar(entrada).catch((e) => e)
    expect(erro.tentavel).toBe(true)
    expect(erro.status).toBeNull()
  })

  it('resposta vazia não é tentável', async () => {
    global.fetch = jest.fn().mockResolvedValue(respostaHttp(200, { content: [] }))
    const erro = await new AnthropicClientService().gerar(entrada).catch((e) => e)
    expect(erro.tentavel).toBe(false)
  })
})
