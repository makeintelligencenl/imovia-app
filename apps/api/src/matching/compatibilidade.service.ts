import { Injectable } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { ImovelInput, PerfilInput } from './types'

/**
 * Fonte única de verdade para regras de compatibilidade imóvel-perfil.
 *
 * Expõe três superfícies da mesma especificação:
 *   - perfilWhere(imovel)  → cláusula Prisma WHERE para buscar PerfilBusca
 *   - imovelWhere(perfil)  → cláusula Prisma WHERE para buscar Imovel
 *   - isCompativel(p, i)   → predicado TypeScript para validação pós-fetch
 *
 * Adicionar ou alterar uma regra de compatibilidade (ex: filtro por vagas)
 * requer editar apenas este arquivo.
 */
@Injectable()
export class CompatibilidadeService {
  /** Prisma WHERE para encontrar perfis compatíveis com um imóvel. */
  perfilWhere(imovel: ImovelInput): Prisma.PerfilBuscaWhereInput {
    return {
      ativo:      true,
      finalidade: imovel.finalidade,
      tipos:      { some: { id: imovel.tipoId } },
      precoMin:   { lte: imovel.preco as number },
      precoMax:   { gte: imovel.preco as number },
      areaMin:    { lte: imovel.areaM2 as number },
      cidades:    { hasSome: [imovel.cidade.nome] },
      AND: [
        ...(imovel.quartos
          ? [{ OR: [{ quartosMin: null }, { quartosMin: { lte: imovel.quartos } }] }]
          : []),
        {
          OR: [
            { bairros: { equals: null } },
            { bairros: { isEmpty: true } },
            ...(imovel.bairro ? [{ bairros: { hasSome: [imovel.bairro] } }] : []),
          ],
        },
      ],
    }
  }

  /** Prisma WHERE para encontrar imóveis compatíveis com um perfil. */
  imovelWhere(perfil: PerfilInput): Prisma.ImovelWhereInput {
    const tipoIds = perfil.tipos.map(t => t.id)
    const bairros = (perfil.bairros ?? []) as string[]
    return {
      status:     'DISPONIVEL',
      finalidade: perfil.finalidade,
      tipoId:     { in: tipoIds },
      preco:      { gte: perfil.precoMin as number, lte: perfil.precoMax as number },
      areaM2:     { gte: perfil.areaMin as number },
      ...(perfil.quartosMin ? { quartos: { gte: perfil.quartosMin } } : {}),
      cidade:     { nome: { in: perfil.cidades } },
      ...(bairros.length > 0 ? { bairro: { in: bairros } } : {}),
    }
  }

  /** Predicado TypeScript — valida compatibilidade após fetch (ex: invalidação). */
  isCompativel(perfil: PerfilInput, imovel: ImovelInput): boolean {
    if (perfil.finalidade !== imovel.finalidade) return false
    if (!perfil.tipos.some(t => t.id === imovel.tipoId)) return false
    if (Number(perfil.precoMin) > Number(imovel.preco)) return false
    if (Number(perfil.precoMax) < Number(imovel.preco)) return false
    if (Number(perfil.areaMin)  > Number(imovel.areaM2)) return false
    if (!perfil.cidades.includes(imovel.cidade.nome)) return false
    if (imovel.quartos && perfil.quartosMin && Number(perfil.quartosMin) > imovel.quartos) return false
    const bairros = (perfil.bairros ?? []) as string[]
    if (bairros.length > 0 && imovel.bairro && !bairros.includes(imovel.bairro)) return false
    return true
  }
}
