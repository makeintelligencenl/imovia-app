import { Injectable } from '@nestjs/common'
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  perfilWhere(imovel: ImovelInput): any {
    return {
      ativo:     true,
      finalidade: imovel.finalidade,
      tipos:     { some: { id: imovel.tipoId } },
      precoMin:  { lte: imovel.preco },
      precoMax:  { gte: imovel.preco },
      areaMin:   { lte: imovel.areaM2 },
      cidades:   { hasSome: [imovel.cidade.nome] },
      AND: [
        ...(imovel.quartos
          ? [{ OR: [{ quartosMin: null }, { quartosMin: { lte: imovel.quartos } }] }]
          : []),
        {
          OR: [
            { bairros: { equals: null } },
            { bairros: { isEmpty: true } },
            { bairros: { hasSome: [imovel.bairro] } },
          ],
        },
      ],
    }
  }

  /** Prisma WHERE para encontrar imóveis compatíveis com um perfil. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  imovelWhere(perfil: PerfilInput & { tipos: { id: string }[] }): any {
    const tipoIds = perfil.tipos.map(t => t.id)
    const bairros = (perfil.bairros ?? []) as string[]
    return {
      status:    'DISPONIVEL',
      finalidade: perfil.finalidade,
      tipoId:    { in: tipoIds },
      preco:     { gte: perfil.precoMin, lte: perfil.precoMax },
      areaM2:    { gte: perfil.areaMin },
      ...(perfil.quartosMin ? { quartos: { gte: perfil.quartosMin } } : {}),
      cidade:    { nome: { in: perfil.cidades } },
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
