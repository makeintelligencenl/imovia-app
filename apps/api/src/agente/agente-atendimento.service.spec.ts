import {
  AgenteAtendimentoService,
  historicoParaModelo,
  pendentesDoCliente,
  TEXTO_MIDIA,
  TEXTO_TRANSFERENCIA_PADRAO,
} from './agente-atendimento.service'
import { ErroLlm } from './llm/llm-client'

const cfgPadrao = {
  ativo: true,
  nome: 'Ana',
  instrucoes: 'Atendente educada.',
  provedor: 'anthropic',
  modelo: 'claude-haiku-5-5',
  tempoRespostaSegundos: 5,
  transferirParaHumano: true,
  mensagemTransferencia: null as string | null,
  usarEmojis: false,
  assinarNome: false,
  restringirTemas: false,
  camposObrigatorios: [] as string[],
  maxMatches: 5,
  itensBase: [] as { itemId: string }[],
}

const conversaPadrao = { id: 'c1', tenantId: 't1', nomeContato: 'Cliente', humanTalk: false }

type Mensagem = { direcao: 'ENTRADA' | 'SAIDA'; tipo: string; texto: string | null; criadaEm?: Date }

async function flush() {
  for (let i = 0; i < 200; i++) await Promise.resolve()
}

function montar(opcoes: {
  cfg?: Partial<typeof cfgPadrao>
  conversa?: Partial<typeof conversaPadrao>
  historico?: Mensagem[]
  chave?: string | null
  llmResposta?: string | (() => Promise<string>)
}) {
  const cfg = { ...cfgPadrao, ...opcoes.cfg }
  const conversa = { ...conversaPadrao, ...opcoes.conversa }
  const historico = opcoes.historico ?? [{ direcao: 'ENTRADA', tipo: 'text', texto: 'Oi' }]

  const prisma = {
    conversaWhatsapp: {
      findFirst: jest.fn(async () => conversa),
      updateMany: jest.fn(),
    },
    mensagemWhatsapp: {
      // O banco devolve em ordem decrescente (mais recente primeiro), como no serviço.
      findMany: jest.fn(async () => [...historico].reverse()),
      create: jest.fn(),
    },
  }
  const configuracao = {
    obter: jest.fn(async () => cfg),
    registrarFalha: jest.fn(),
    limparFalha: jest.fn(),
  }
  const chaves = {
    obterChave: jest.fn(async () => (opcoes.chave === undefined ? 'sk-chave-1234' : opcoes.chave)),
  }
  const base = { buscarTrechos: jest.fn(async () => []) }
  const ferramentas = { executar: jest.fn(async () => 'ok') }
  const resposta = opcoes.llmResposta ?? 'Olá!'
  const gerar = jest.fn(async () => (typeof resposta === 'function' ? resposta() : resposta))
  const anthropic = { gerarComFerramentas: gerar, gerar: jest.fn() }
  const openai = { gerarComFerramentas: jest.fn(), gerar: jest.fn() }
  const whatsapp = { enviarTexto: jest.fn(async () => 'wamid.1') }

  const servico = new AgenteAtendimentoService(
    prisma as never,
    configuracao as never,
    chaves as never,
    base as never,
    ferramentas as never,
    anthropic as never,
    openai as never,
    whatsapp as never,
  )
  return { servico, prisma, configuracao, whatsapp, gerar, ferramentas }
}

beforeEach(() => jest.useFakeTimers())
afterEach(() => jest.useRealTimers())

describe('temporizador de resposta', () => {
  it('não agenda nada com o agente desligado', async () => {
    const { servico, prisma } = montar({ cfg: { ativo: false } })
    await servico.agendarResposta('t1', 'c1', '5531988887777')
    jest.advanceTimersByTime(10_000)
    await flush()
    expect(prisma.conversaWhatsapp.findFirst).not.toHaveBeenCalled()
  })

  it('responde uma única vez quando chegam mensagens seguidas', async () => {
    const { servico, whatsapp } = montar({})
    await servico.agendarResposta('t1', 'c1', '5531988887777')
    await servico.agendarResposta('t1', 'c1', '5531988887777')
    jest.advanceTimersByTime(5_000)
    await flush()
    expect(whatsapp.enviarTexto).toHaveBeenCalledTimes(1)
  })

  it('cancelarPendencia impede o envio', async () => {
    const { servico, whatsapp } = montar({})
    await servico.agendarResposta('t1', 'c1', '5531988887777')
    servico.cancelarPendencia('c1')
    jest.advanceTimersByTime(5_000)
    await flush()
    expect(whatsapp.enviarTexto).not.toHaveBeenCalled()
  })
})

describe('responder', () => {
  it('envia a resposta, grava a saída com o id da Meta e limpa a falha', async () => {
    const { servico, whatsapp, configuracao, prisma } = montar({})
    await servico.agendarResposta('t1', 'c1', '5531988887777')
    jest.advanceTimersByTime(5_000)
    await flush()
    expect(whatsapp.enviarTexto).toHaveBeenCalledWith('t1', '5531988887777', 'Olá!')
    expect(prisma.mensagemWhatsapp.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ conversaId: 'c1', waMessageId: 'wamid.1', direcao: 'SAIDA', texto: 'Olá!' }),
    })
    expect(configuracao.limparFalha).toHaveBeenCalledWith('t1')
  })

  it('assina com o nome do agente quando a opção está ligada', async () => {
    const { servico, whatsapp } = montar({ cfg: { assinarNome: true } })
    await servico.agendarResposta('t1', 'c1', '5531988887777')
    jest.advanceTimersByTime(5_000)
    await flush()
    expect(whatsapp.enviarTexto).toHaveBeenCalledWith('t1', '5531988887777', 'Ana: Olá!')
  })

  it('não responde quando um humano já assumiu a conversa', async () => {
    const { servico, whatsapp } = montar({ conversa: { humanTalk: true } })
    await servico.agendarResposta('t1', 'c1', '5531988887777')
    jest.advanceTimersByTime(5_000)
    await flush()
    expect(whatsapp.enviarTexto).not.toHaveBeenCalled()
  })

  it('não responde quando a última mensagem já foi do agente', async () => {
    const { servico, whatsapp } = montar({
      historico: [
        { direcao: 'ENTRADA', tipo: 'text', texto: 'Oi' },
        { direcao: 'SAIDA', tipo: 'text', texto: 'Olá!' },
      ],
    })
    await servico.agendarResposta('t1', 'c1', '5531988887777')
    jest.advanceTimersByTime(5_000)
    await flush()
    expect(whatsapp.enviarTexto).not.toHaveBeenCalled()
  })

  it('sem chave do provedor, registra a falha e não envia nada', async () => {
    const { servico, whatsapp, configuracao } = montar({ chave: null })
    await servico.agendarResposta('t1', 'c1', '5531988887777')
    jest.advanceTimersByTime(5_000)
    await flush()
    expect(whatsapp.enviarTexto).not.toHaveBeenCalled()
    expect(configuracao.registrarFalha).toHaveBeenCalledWith('t1', expect.stringContaining('chave'))
  })

  it('erro do provedor registra a falha e não muda o estado da conversa', async () => {
    const { servico, whatsapp, configuracao, prisma } = montar({
      llmResposta: async () => {
        throw new ErroLlm('A chave do provedor de IA é inválida ou não tem permissão.', 401, false)
      },
    })
    await servico.agendarResposta('t1', 'c1', '5531988887777')
    jest.advanceTimersByTime(5_000)
    await flush()
    expect(whatsapp.enviarTexto).not.toHaveBeenCalled()
    expect(configuracao.registrarFalha).toHaveBeenCalledWith('t1', expect.stringContaining('inválida'))
    expect(prisma.conversaWhatsapp.updateMany).not.toHaveBeenCalled()
  })

  it('transfere quando o modelo pede (marcador) e envia a frase gerada', async () => {
    const { servico, whatsapp, prisma } = montar({
      llmResposta: '[[TRANSFERIR]] Um atendente vai continuar com você.',
    })
    await servico.agendarResposta('t1', 'c1', '5531988887777')
    jest.advanceTimersByTime(5_000)
    await flush()
    expect(whatsapp.enviarTexto).toHaveBeenCalledWith('t1', '5531988887777', 'Um atendente vai continuar com você.')
    expect(prisma.conversaWhatsapp.updateMany).toHaveBeenCalledWith({
      where: { id: 'c1', tenantId: 't1' },
      data: { humanTalk: true, assumidoPorId: null },
    })
  })
})

describe('mídia do cliente', () => {
  const comMidia: Mensagem[] = [{ direcao: 'ENTRADA', tipo: 'audio', texto: null }]

  it('com transferência ligada, avisa e passa para um humano sem chamar o modelo', async () => {
    const { servico, whatsapp, gerar, prisma } = montar({ historico: comMidia })
    await servico.agendarResposta('t1', 'c1', '5531988887777')
    jest.advanceTimersByTime(5_000)
    await flush()
    expect(gerar).not.toHaveBeenCalled()
    expect(whatsapp.enviarTexto).toHaveBeenCalledWith('t1', '5531988887777', TEXTO_TRANSFERENCIA_PADRAO)
    expect(prisma.conversaWhatsapp.updateMany).toHaveBeenCalled()
  })

  it('com transferência desligada, pede que escreva em texto', async () => {
    const { servico, whatsapp, prisma } = montar({ historico: comMidia, cfg: { transferirParaHumano: false } })
    await servico.agendarResposta('t1', 'c1', '5531988887777')
    jest.advanceTimersByTime(5_000)
    await flush()
    expect(whatsapp.enviarTexto).toHaveBeenCalledWith('t1', '5531988887777', TEXTO_MIDIA)
    expect(prisma.conversaWhatsapp.updateMany).not.toHaveBeenCalled()
  })
})

describe('funções puras do atendimento', () => {
  it('pendentes são as mensagens do cliente depois da última resposta', () => {
    const historico: Mensagem[] = [
      { direcao: 'ENTRADA', tipo: 'text', texto: 'a' },
      { direcao: 'SAIDA', tipo: 'text', texto: 'resp' },
      { direcao: 'ENTRADA', tipo: 'text', texto: 'b' },
      { direcao: 'ENTRADA', tipo: 'text', texto: 'c' },
    ]
    expect(pendentesDoCliente(historico).map((m) => m.texto)).toEqual(['b', 'c'])
  })

  it('histórico para o modelo: cliente vira user, agente vira assistant, mídia vira marcador', () => {
    expect(
      historicoParaModelo([
        { direcao: 'ENTRADA', tipo: 'text', texto: 'Oi' },
        { direcao: 'SAIDA', tipo: 'text', texto: 'Olá!' },
        { direcao: 'ENTRADA', tipo: 'image', texto: null },
      ]),
    ).toEqual([
      { papel: 'user', texto: 'Oi' },
      { papel: 'assistant', texto: 'Olá!' },
      { papel: 'user', texto: '[image]' },
    ])
  })
})

describe('recuperação ao iniciar', () => {
  it('agenda só as conversas cuja última mensagem é do cliente dentro da janela', async () => {
    const agora = new Date('2026-11-16T12:00:00Z')
    const { servico, prisma } = montar({})
    const db = prisma as any
    const agendar = jest.spyOn(servico, 'agendarResposta').mockResolvedValue(undefined)

    db.conversaWhatsapp.findMany = jest.fn(async () => [
      { id: 'c-cliente', tenantId: 't1', telefone: '5531911111111' },
      { id: 'c-agente', tenantId: 't1', telefone: '5531922222222' },
      { id: 'c-antiga', tenantId: 't1', telefone: '5531933333333' },
    ])
    db.mensagemWhatsapp.findFirst = jest.fn(async ({ where }: { where: { conversaId: string } }) => {
      if (where.conversaId === 'c-cliente') return { direcao: 'ENTRADA', criadaEm: new Date(agora.getTime() - 60_000) }
      if (where.conversaId === 'c-agente') return { direcao: 'SAIDA', criadaEm: new Date(agora.getTime() - 60_000) }
      return { direcao: 'ENTRADA', criadaEm: new Date(agora.getTime() - 30 * 60_000) }
    })

    const total = await servico.recuperarPendentes(agora)
    expect(total).toBe(1)
    expect(agendar).toHaveBeenCalledWith('t1', 'c-cliente', '5531911111111', 0)
  })
})

describe('testar o agente', () => {
  it('exige que a última mensagem seja do cliente', async () => {
    const { servico } = montar({})
    await expect(servico.testar('t1', [{ papel: 'agente', texto: 'Oi' }])).rejects.toThrow()
  })

  it('não envia nem grava nada, e devolve a resposta do modelo', async () => {
    const { servico, whatsapp, prisma, gerar } = montar({ llmResposta: 'Temos apartamentos no Centro.' })
    const resultado = await servico.testar('t1', [{ papel: 'cliente', texto: 'Quero um apartamento' }])
    expect(resultado).toEqual({ tipo: 'resposta', texto: 'Temos apartamentos no Centro.' })
    expect(whatsapp.enviarTexto).not.toHaveBeenCalled()
    expect((prisma as any).mensagemWhatsapp.create).not.toHaveBeenCalled()
    expect(gerar).toHaveBeenCalledTimes(1)
  })

  it('sem chave cadastrada, recusa o teste', async () => {
    const { servico } = montar({ chave: null })
    await expect(servico.testar('t1', [{ papel: 'cliente', texto: 'Oi' }])).rejects.toThrow('chave')
  })
})
