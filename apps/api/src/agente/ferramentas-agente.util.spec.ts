import {
  camposFaltando,
  formatarImoveis,
  formatarPreco,
  lerFinalidade,
  normalizarTelefone,
} from './ferramentas-agente.util'

describe('camposFaltando', () => {
  it('sempre exige finalidade, tipo, cidade e preço máximo', () => {
    expect(camposFaltando({}, [])).toEqual(expect.arrayContaining(['finalidade', 'tipo', 'cidade', 'precoMax']))
  })

  it('não cobra preço mínimo quando a imobiliária não marcou', () => {
    const dados = { finalidade: 'VENDA' as const, tipo: 'Casa', cidade: 'Belo Horizonte', precoMax: 500000 }
    expect(camposFaltando(dados, [])).toEqual([])
  })

  it('cobra os campos opcionais que a imobiliária marcou como obrigatórios', () => {
    const dados = { finalidade: 'VENDA' as const, tipo: 'Casa', cidade: 'BH', precoMax: 500000 }
    expect(camposFaltando(dados, ['quartosMin', 'bairros'])).toEqual(['quartosMin', 'bairros'])
  })

  it('lista vazia conta como faltando', () => {
    const dados = { finalidade: 'VENDA' as const, tipo: 'Casa', cidade: 'BH', precoMax: 1, bairros: [] }
    expect(camposFaltando(dados, ['bairros'])).toEqual(['bairros'])
  })
})

describe('normalizarTelefone', () => {
  it('deixa só os dígitos', () => {
    expect(normalizarTelefone('+55 (31) 98888-7777')).toBe('5531988887777')
  })
})

describe('lerFinalidade', () => {
  it('aceita sinônimos e ignora valores desconhecidos', () => {
    expect(lerFinalidade('compra')).toBe('VENDA')
    expect(lerFinalidade('alugar')).toBe('ALUGUEL')
    expect(lerFinalidade('permuta')).toBeUndefined()
  })
})

describe('formatarImoveis', () => {
  it('avisa quando não há imóvel', () => {
    expect(formatarImoveis([])).toContain('Nenhum imóvel')
  })

  it('lista uma linha por imóvel com preço, área, quartos e link', () => {
    const texto = formatarImoveis([
      {
        titulo: 'Apartamento Centro',
        preco: 450000,
        areaM2: 80,
        quartos: 2,
        bairro: 'Centro',
        urlImovel: 'https://exemplo.com/1',
        cidade: { nome: 'Belo Horizonte' },
      },
    ])
    expect(texto).toContain('1. Apartamento Centro')
    expect(texto).toContain('80 m²')
    expect(texto).toContain('2 quarto(s)')
    expect(texto).toContain('https://exemplo.com/1')
  })

  it('aceita preço no formato Decimal do Prisma', () => {
    const texto = formatarImoveis([
      {
        titulo: 'Casa',
        preco: { toNumber: () => 300000 },
        areaM2: { toNumber: () => 120 },
        quartos: null,
        bairro: null,
        urlImovel: null,
        cidade: { nome: 'Contagem' },
      },
    ])
    expect(texto).toContain('120 m²')
    expect(texto).toContain(formatarPreco(300000))
  })
})
