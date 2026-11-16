import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { randomUUID } from 'crypto'
import { ChavesIaService } from '../agente/chaves-ia.service'
import { PrismaService } from '../prisma/prisma.service'
import { dividirEmTrechos } from './chunking.util'
import { EmbeddingsOpenAiService } from './embeddings-openai.service'

export const LIMITES_BASE = { titulo: 120, conteudo: 20000, trechosBusca: 8 } as const

export type ItemBaseEntrada = { titulo?: string; conteudo?: string }

// Valida título e conteúdo. Retorna a lista de erros (vazia se estiver tudo certo).
export function validarItemBase(entrada: ItemBaseEntrada, exigirCampos: boolean): string[] {
  const erros: string[] = []
  if (entrada.titulo === undefined && exigirCampos) erros.push('Informe o título.')
  if (entrada.conteudo === undefined && exigirCampos) erros.push('Informe o conteúdo.')

  if (entrada.titulo !== undefined && (!entrada.titulo.trim() || entrada.titulo.length > LIMITES_BASE.titulo)) {
    erros.push(`O título deve ter de 1 a ${LIMITES_BASE.titulo} caracteres.`)
  }
  if (entrada.conteudo !== undefined && (!entrada.conteudo.trim() || entrada.conteudo.length > LIMITES_BASE.conteudo)) {
    erros.push(`O conteúdo deve ter de 1 a ${LIMITES_BASE.conteudo} caracteres.`)
  }
  return erros
}

// Vetor no formato textual aceito pelo pgvector: [0.1,0.2,...]
export function vetorParaSql(vetor: number[]): string {
  return `[${vetor.join(',')}]`
}

@Injectable()
export class BaseConhecimentoService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly chaves: ChavesIaService,
    private readonly embeddings: EmbeddingsOpenAiService,
  ) {}

  listar(tenantId: string) {
    return this.prisma.baseConhecimentoItem.findMany({
      where: { tenantId },
      orderBy: { atualizadoEm: 'desc' },
      select: { id: true, titulo: true, tipo: true, conteudo: true, criadoEm: true, atualizadoEm: true },
    })
  }

  async criar(tenantId: string, entrada: ItemBaseEntrada) {
    const erros = validarItemBase(entrada, true)
    if (erros.length > 0) throw new BadRequestException(erros)
    const apiKey = await this.exigirChaveOpenAi(tenantId)

    const item = await this.prisma.baseConhecimentoItem.create({
      data: { tenantId, titulo: entrada.titulo!.trim(), tipo: 'texto', conteudo: entrada.conteudo!.trim() },
    })
    await this.reindexar(item.id, item.conteudo, apiKey)
    return item
  }

  async atualizar(tenantId: string, itemId: string, entrada: ItemBaseEntrada) {
    const atual = await this.buscarDoTenant(tenantId, itemId)
    const erros = validarItemBase(entrada, false)
    if (erros.length > 0) throw new BadRequestException(erros)

    const dados: { titulo?: string; conteudo?: string } = {}
    if (entrada.titulo !== undefined) dados.titulo = entrada.titulo.trim()
    if (entrada.conteudo !== undefined) dados.conteudo = entrada.conteudo.trim()

    const conteudoMudou = dados.conteudo !== undefined && dados.conteudo !== atual.conteudo
    const apiKey = conteudoMudou ? await this.exigirChaveOpenAi(tenantId) : null

    const item = await this.prisma.baseConhecimentoItem.update({ where: { id: itemId }, data: dados })
    if (apiKey) await this.reindexar(item.id, item.conteudo, apiKey)
    return item
  }

  async remover(tenantId: string, itemId: string): Promise<void> {
    await this.buscarDoTenant(tenantId, itemId)
    await this.prisma.baseConhecimentoItem.delete({ where: { id: itemId } })
  }

  // Busca os trechos mais próximos da pergunta, só entre os itens atribuídos ao agente.
  // Sem itens atribuídos, não gera embedding nem consulta nada.
  async buscarTrechos(tenantId: string, itemIds: string[], pergunta: string): Promise<{ titulo: string; conteudo: string }[]> {
    if (itemIds.length === 0 || !pergunta.trim()) return []
    const apiKey = await this.exigirChaveOpenAi(tenantId)
    const [vetor] = await this.embeddings.gerar([pergunta], apiKey)
    const literal = vetorParaSql(vetor)

    // O CTE materializado filtra pelos itens antes de ordenar: o índice vetorial não é usado,
    // então a ordenação é exata sobre o subconjunto (sem perder trechos por causa do filtro).
    return this.prisma.$queryRaw<{ titulo: string; conteudo: string }[]>(Prisma.sql`
      WITH candidatos AS MATERIALIZED (
        SELECT c.conteudo, c.vetor, i.titulo
          FROM base_conhecimento_chunks c
          JOIN base_conhecimento_itens i ON i.id = c."itemId"
         WHERE c."itemId" = ANY(${itemIds}::text[])
           AND i."tenantId" = ${tenantId}
           AND c.vetor IS NOT NULL
      )
      SELECT titulo, conteudo
        FROM candidatos
       ORDER BY vetor <=> ${literal}::vector
       LIMIT ${LIMITES_BASE.trechosBusca}
    `)
  }

  private async buscarDoTenant(tenantId: string, itemId: string) {
    const item = await this.prisma.baseConhecimentoItem.findFirst({ where: { id: itemId, tenantId } })
    if (!item) throw new NotFoundException('Item da base não encontrado.')
    return item
  }

  private async exigirChaveOpenAi(tenantId: string): Promise<string> {
    const chave = await this.chaves.obterChave(tenantId, 'openai')
    if (!chave) {
      throw new BadRequestException('Cadastre a chave da OpenAI antes de salvar a base de conhecimento.')
    }
    return chave
  }

  // Recalcula os trechos e os vetores do item. Tudo ou nada: falha no provedor não apaga os trechos antigos.
  private async reindexar(itemId: string, conteudo: string, apiKey: string): Promise<void> {
    const trechos = dividirEmTrechos(conteudo)
    const vetores = trechos.length > 0 ? await this.embeddings.gerar(trechos, apiKey) : []

    await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`DELETE FROM base_conhecimento_chunks WHERE "itemId" = ${itemId}`
      for (let ordem = 0; ordem < trechos.length; ordem++) {
        await tx.$executeRaw`
          INSERT INTO base_conhecimento_chunks (id, "itemId", ordem, conteudo, vetor)
          VALUES (${randomUUID()}, ${itemId}, ${ordem}, ${trechos[ordem]}, ${vetorParaSql(vetores[ordem])}::vector)
        `
      }
    })
  }
}
