/** Tipos compartilhados dentro do módulo de matching. */

export interface ImovelInput {
  id:         string
  finalidade: string
  tipoId:     string
  preco:      number | { toNumber(): number }
  areaM2:     number | { toNumber(): number }
  quartos:    number | null
  bairro:     string | null
  cidade:     { nome: string }
}

export interface PerfilInput {
  id:         string
  finalidade: string
  tipos:      { id: string }[]
  precoMin:   number | { toNumber(): number }
  precoMax:   number | { toNumber(): number }
  areaMin:    number | { toNumber(): number }
  quartosMin: number | null
  cidades:    string[]
  bairros:    string[] | null
}

export interface ScoringInput {
  perfil: PerfilInput
  imovel: ImovelInput
}
