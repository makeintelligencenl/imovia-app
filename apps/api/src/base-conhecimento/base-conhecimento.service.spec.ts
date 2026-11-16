import { BadRequestException, NotFoundException } from '@nestjs/common'
import { BaseConhecimentoService, LIMITES_BASE, validarItemBase, vetorParaSql } from './base-conhecimento.service'

function montar(chaveOpenAi: string | null) {
  const tx = {
    $executeRaw: jest.fn(),
  }
  const prisma = {
    baseConhecimentoItem: {
      create: jest.fn(async ({ data }) => ({ id: 'item-1', ...data })),
      update: jest.fn(async ({ data }) => ({ id: 'item-1', titulo: 'Título', conteudo: 'Conteúdo', ...data })),
      findFirst: jest.fn(),
      delete: jest.fn(),
    },
    $transaction: jest.fn(async (fn) => fn(tx)),
    $queryRaw: jest.fn().mockResolvedValue([]),
    $executeRaw: jest.fn(),
  }
  const chaves = { obterChave: jest.fn().mockResolvedValue(chaveOpenAi) }
  const embeddings = { gerar: jest.fn(async (textos: string[]) => textos.map(() => new Array(1536).fill(0.1))) }
  const servico = new BaseConhecimentoService(prisma as never, chaves as never, embeddings as never)
  return { servico, prisma, tx, embeddings }
}

describe('validarItemBase', () => {
  it('exige título e conteúdo na criação', () => {
    expect(validarItemBase({}, true)).toHaveLength(2)
  })

  it('aceita atualização parcial', () => {
    expect(validarItemBase({ titulo: 'Novo título' }, false)).toEqual([])
  })

  it('rejeita título e conteúdo acima do limite', () => {
    expect(validarItemBase({ titulo: 'x'.repeat(LIMITES_BASE.titulo + 1) }, false)).toHaveLength(1)
    expect(validarItemBase({ conteudo: 'x'.repeat(LIMITES_BASE.conteudo + 1) }, false)).toHaveLength(1)
  })
})

describe('vetorParaSql', () => {
  it('monta o literal aceito pelo pgvector', () => {
    expect(vetorParaSql([0.5, -1, 2])).toBe('[0.5,-1,2]')
  })
})

describe('BaseConhecimentoService', () => {
  it('não salva sem chave da OpenAI', async () => {
    const { servico, prisma } = montar(null)
    await expect(servico.criar('tenant-1', { titulo: 'T', conteudo: 'C' })).rejects.toBeInstanceOf(BadRequestException)
    expect(prisma.baseConhecimentoItem.create).not.toHaveBeenCalled()
  })

  it('cria o item e reindexa os trechos com vetores', async () => {
    const { servico, prisma, tx, embeddings } = montar('sk-chave-1234')
    await servico.criar('tenant-1', { titulo: '  Financiamento  ', conteudo: 'Aceitamos FGTS.' })
    expect(prisma.baseConhecimentoItem.create.mock.calls[0][0].data.titulo).toBe('Financiamento')
    expect(embeddings.gerar).toHaveBeenCalledWith(['Aceitamos FGTS.'], 'sk-chave-1234')
    expect(prisma.$transaction).toHaveBeenCalled()
    expect(tx.$executeRaw).toHaveBeenCalled()
  })

  it('não reindexa quando só o título muda', async () => {
    const { servico, prisma, embeddings } = montar('sk-chave-1234')
    prisma.baseConhecimentoItem.findFirst.mockResolvedValue({ id: 'item-1', tenantId: 'tenant-1', conteudo: 'Igual' })
    await servico.atualizar('tenant-1', 'item-1', { titulo: 'Outro título' })
    expect(embeddings.gerar).not.toHaveBeenCalled()
  })

  it('não altera item de outra imobiliária', async () => {
    const { servico, prisma } = montar('sk-chave-1234')
    prisma.baseConhecimentoItem.findFirst.mockResolvedValue(null)
    await expect(servico.remover('tenant-1', 'item-de-outro')).rejects.toBeInstanceOf(NotFoundException)
    expect(prisma.baseConhecimentoItem.delete).not.toHaveBeenCalled()
  })

  it('busca trechos sem itens atribuídos não gera embedding nem consulta o banco', async () => {
    const { servico, prisma, embeddings } = montar('sk-chave-1234')
    await expect(servico.buscarTrechos('tenant-1', [], 'pergunta')).resolves.toEqual([])
    expect(embeddings.gerar).not.toHaveBeenCalled()
    expect(prisma.$queryRaw).not.toHaveBeenCalled()
  })
})
