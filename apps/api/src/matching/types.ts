/** Tipos compartilhados dentro do módulo de matching. */

import { Finalidade } from '@prisma/client'

export interface ImovelInput {
  id:         string
  finalidade: Finalidade
  tipoId:     string
  preco:      number | { toNumber(): number }
  areaM2:     number | { toNumber(): number }
  quartos:    number | null
  bairro:     string | null
  cidadeId:   number
  cidade:     { nome: string }
}

export interface PerfilInput {
  id:         string
  finalidade: Finalidade
  tipos:      { id: string }[]
  precoMin:   number | { toNumber(): number }
  precoMax:   number | { toNumber(): number }
  areaMin:    number | { toNumber(): number }
  quartosMin: number | null
  cidadeId:   number | null
  bairros:    string[] | null
}

export interface PerfilComCliente extends PerfilInput {
  cliente: {
    email:      string | null
    nome:       string | null
    telefone:   string | null
    corretorId: string | null
  }
}

export interface ScoringInput {
  perfil: PerfilInput
  imovel: ImovelInput
}
