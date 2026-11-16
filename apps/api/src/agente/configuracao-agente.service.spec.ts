import { BadRequestException } from '@nestjs/common'
import { ConfiguracaoAgenteService, TEXTO_BASE_INSTRUCOES } from './configuracao-agente.service'

function montar(provedoresComChave: Array<'anthropic' | 'openai'>, configuracaoAtual: Record<string, unknown> | null) {
  const prisma = {
    configuracaoAgente: {
      upsert: jest.fn(async (args) => ({ id: 'cfg-1', ...args.create, itensBase: [] })),
      update: jest.fn(async (args) => ({ id: 'cfg-1', ...configuracaoAtual, ...args.data, itensBase: [] })),
      updateMany: jest.fn(),
    },
    baseConhecimentoItem: { count: jest.fn() },
    agenteItemBase: {
      deleteMany: jest.fn(),
      createMany: jest.fn(),
    },
    $transaction: jest.fn(async (ops: Promise<unknown>[]) => Promise.all(ops)),
  }
  const chaves = { provedoresComChave: jest.fn().mockResolvedValue(provedoresComChave) }
  const servico = new ConfiguracaoAgenteService(prisma as never, chaves as never)
  return { servico, prisma, chaves }
}

describe('ConfiguracaoAgenteService.obter', () => {
  it('cria a configuração padrão com o provedor que tem chave e o modelo rápido', async () => {
    const { servico, prisma } = montar(['openai'], null)
    await servico.obter('tenant-1')
    const criado = prisma.configuracaoAgente.upsert.mock.calls[0][0].create
    expect(criado).toMatchObject({
      tenantId: 'tenant-1',
      provedor: 'openai',
      modelo: 'gpt-6-luna',
      instrucoes: TEXTO_BASE_INSTRUCOES,
    })
  })

  it('sem nenhuma chave, usa Anthropic como provedor padrão', async () => {
    const { servico, prisma } = montar([], null)
    await servico.obter('tenant-1')
    expect(prisma.configuracaoAgente.upsert.mock.calls[0][0].create.provedor).toBe('anthropic')
  })
})

describe('ConfiguracaoAgenteService.atualizar', () => {
  it('recusa entrada inválida com BadRequest e não grava nada', async () => {
    const { servico, prisma } = montar(['openai'], { provedor: 'openai', modelo: 'gpt-6-luna' })
    await expect(servico.atualizar('tenant-1', { tempoRespostaSegundos: 7 })).rejects.toBeInstanceOf(
      BadRequestException,
    )
    expect(prisma.configuracaoAgente.update).not.toHaveBeenCalled()
  })

  it('ao trocar de provedor sem informar modelo, usa o modelo rápido do novo provedor', async () => {
    const { servico, prisma } = montar(['openai', 'anthropic'], { provedor: 'openai', modelo: 'gpt-6-luna' })
    await servico.atualizar('tenant-1', { provedor: 'anthropic' })
    const dados = prisma.configuracaoAgente.update.mock.calls[0][0].data
    expect(dados).toMatchObject({ provedor: 'anthropic', modelo: 'claude-haiku-5-5' })
  })

  it('ignora campos que não são editáveis pela API', async () => {
    const { servico, prisma } = montar(['openai'], { provedor: 'openai', modelo: 'gpt-6-luna' })
    await servico.atualizar('tenant-1', { nome: 'Ana', tenantId: 'outro-tenant' } as never)
    const dados = prisma.configuracaoAgente.update.mock.calls[0][0].data
    expect(dados).toEqual({ nome: 'Ana' })
  })
})

describe('ConfiguracaoAgenteService.definirItens', () => {
  it('recusa item que não pertence à imobiliária', async () => {
    const { servico, prisma } = montar(['openai'], null)
    prisma.baseConhecimentoItem.count.mockResolvedValue(1)
    await expect(servico.definirItens('tenant-1', ['item-a', 'item-de-outro-tenant'])).rejects.toBeInstanceOf(
      BadRequestException,
    )
    expect(prisma.$transaction).not.toHaveBeenCalled()
  })

  it('substitui o conjunto de itens e remove duplicados', async () => {
    const { servico, prisma } = montar(['openai'], null)
    prisma.baseConhecimentoItem.count.mockResolvedValue(2)
    const ids = await servico.definirItens('tenant-1', ['item-a', 'item-b', 'item-a'])
    expect(ids).toEqual(['item-a', 'item-b'])
    expect(prisma.agenteItemBase.deleteMany).toHaveBeenCalledWith({ where: { configuracaoId: 'cfg-1' } })
    expect(prisma.agenteItemBase.createMany).toHaveBeenCalledWith({
      data: [
        { configuracaoId: 'cfg-1', itemId: 'item-a' },
        { configuracaoId: 'cfg-1', itemId: 'item-b' },
      ],
    })
  })
})
