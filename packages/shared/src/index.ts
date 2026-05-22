export type TipoImovel = 'APARTAMENTO' | 'CASA' | 'COMERCIAL' | 'TERRENO' | 'RURAL'
export type Finalidade = 'ALUGUEL' | 'VENDA'
export type StatusImovel = 'DISPONIVEL' | 'RESERVADO' | 'ALUGADO' | 'VENDIDO' | 'INATIVO'
export type StatusMatch = 'NOTIFICADO' | 'VISUALIZADO' | 'INTERESSADO' | 'EM_NEGOCIACAO' | 'FECHADO' | 'DESCARTADO'
export type Role = 'ADMIN' | 'CORRETOR'

export interface ImovelSummary {
  id: string
  titulo: string
  tipo: TipoImovel
  finalidade: Finalidade
  preco: number
  areaM2: number
  quartos?: number
  bairro: string
  cidade: string
  estado: string
  status: StatusImovel
}

export interface PerfilBuscaSummary {
  id: string
  clienteNome: string
  clienteEmail: string
  finalidade: Finalidade
  tipo: TipoImovel[]
  precoMin: number
  precoMax: number
  areaMin: number
  cidades: string[]
}
