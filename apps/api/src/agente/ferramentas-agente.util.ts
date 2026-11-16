// Regras puras das ferramentas do agente: definições para o modelo, campos obrigatórios,
// telefone e formatação dos imóveis. Não acessa banco.
import { FerramentaLlm } from './llm/llm-client'

export const FERRAMENTA_BUSCAR_IMOVEIS = 'buscar_imoveis'
export const FERRAMENTA_SALVAR_DADOS = 'salvar_dados_cliente'

// Campos sempre obrigatórios: sem eles não existe busca.
export const CAMPOS_FIXOS = ['finalidade', 'tipo', 'cidade'] as const
// Preço máximo também é sempre exigido: o perfil no banco não aceita valor vazio.
export const CAMPOS_SEMPRE_EXIGIDOS_BANCO = ['precoMax'] as const

export const DEFINICOES_FERRAMENTAS: FerramentaLlm[] = [
  {
    nome: FERRAMENTA_BUSCAR_IMOVEIS,
    descricao:
      'Lista os imóveis compatíveis com o perfil do cliente que está conversando. Use depois de salvar os dados do perfil.',
    esquema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    nome: FERRAMENTA_SALVAR_DADOS,
    descricao:
      'Salva os dados do cliente e do perfil de busca. Chame sempre que o cliente informar algum desses dados. Envie só o que o cliente disse.',
    esquema: {
      type: 'object',
      properties: {
        nome: { type: 'string', description: 'Nome do cliente' },
        email: { type: 'string', description: 'Email do cliente, se ele informar' },
        finalidade: { type: 'string', enum: ['VENDA', 'ALUGUEL'], description: 'Se quer comprar ou alugar' },
        tipo: { type: 'string', description: 'Tipo de imóvel, como Apartamento ou Casa' },
        cidade: { type: 'string', description: 'Cidade desejada' },
        precoMin: { type: 'number', description: 'Preço mínimo em reais' },
        precoMax: { type: 'number', description: 'Preço máximo em reais' },
        areaMin: { type: 'number', description: 'Área mínima em m²' },
        quartosMin: { type: 'integer', description: 'Número mínimo de quartos' },
        bairros: { type: 'array', items: { type: 'string' }, description: 'Bairros de interesse' },
      },
      additionalProperties: false,
    },
  },
]

export type DadosPerfil = {
  finalidade?: 'VENDA' | 'ALUGUEL'
  tipo?: string
  cidade?: string
  precoMin?: number
  precoMax?: number
  areaMin?: number
  quartosMin?: number
  bairros?: string[]
}

// Campos que ainda faltam: os fixos, o preço máximo, e os que a imobiliária marcou como obrigatórios.
export function camposFaltando(dados: DadosPerfil, camposObrigatorios: string[]): string[] {
  const exigidos = new Set<string>([...CAMPOS_FIXOS, ...CAMPOS_SEMPRE_EXIGIDOS_BANCO, ...camposObrigatorios])
  const faltando: string[] = []
  for (const campo of exigidos) {
    const valor = dados[campo as keyof DadosPerfil]
    const vazio = valor === undefined || valor === null || valor === '' || (Array.isArray(valor) && valor.length === 0)
    if (vazio) faltando.push(campo)
  }
  return faltando
}

// Só dígitos, com DDI. Garante que o mesmo número sempre vira a mesma chave.
export function normalizarTelefone(telefone: string): string {
  return telefone.replace(/\D/g, '')
}

export type ImovelResumo = {
  titulo: string
  preco: number | { toNumber(): number }
  areaM2: number | { toNumber(): number }
  quartos: number | null
  bairro: string | null
  urlImovel: string | null
  cidade: { nome: string }
}

function numero(v: number | { toNumber(): number }): number {
  return typeof v === 'number' ? v : v.toNumber()
}

export function formatarPreco(valor: number): string {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
}

// Texto que o modelo recebe com a lista de imóveis. Uma linha por imóvel, sem markdown.
export function formatarImoveis(imoveis: ImovelResumo[]): string {
  if (imoveis.length === 0) return 'Nenhum imóvel compatível com o perfil no momento.'
  return imoveis
    .map((i, n) => {
      const partes = [
        `${n + 1}. ${i.titulo}`,
        `${formatarPreco(numero(i.preco))}`,
        `${numero(i.areaM2)} m²`,
        i.quartos !== null ? `${i.quartos} quarto(s)` : null,
        i.bairro ? `bairro ${i.bairro}` : null,
        i.cidade.nome,
      ].filter(Boolean)
      const link = i.urlImovel ? ` — ${i.urlImovel}` : ''
      return `${partes.join(', ')}${link}`
    })
    .join('\n')
}

// Converte o texto da finalidade do modelo no enum do banco.
export function lerFinalidade(valor: unknown): 'VENDA' | 'ALUGUEL' | undefined {
  const texto = typeof valor === 'string' ? valor.trim().toUpperCase() : ''
  if (texto === 'VENDA' || texto === 'COMPRA') return 'VENDA'
  if (texto === 'ALUGUEL' || texto === 'ALUGAR') return 'ALUGUEL'
  return undefined
}
