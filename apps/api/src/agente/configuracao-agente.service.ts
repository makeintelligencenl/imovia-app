import { BadRequestException, Injectable } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'
import { AtualizacaoAgente, validarAtualizacaoAgente } from './agente-validacao.util'
import { ChavesIaService } from './chaves-ia.service'
import { modeloPadrao, ProvedorIa } from './modelos-agente'

export const TEXTO_BASE_INSTRUCOES =
  'Você é um atendente da imobiliária. Seja educado e objetivo, com respostas curtas. ' +
  'Responda dúvidas sobre imóveis e serviços usando a base de conhecimento. ' +
  'Não negocie preços fora do que está na base. ' +
  'Quando o cliente quiser comprar ou alugar, peça o nome e o que ele procura.'

// Campos que a API aceita gravar. Qualquer outra chave do corpo é ignorada.
const CAMPOS_EDITAVEIS = [
  'ativo',
  'nome',
  'instrucoes',
  'provedor',
  'modelo',
  'tempoRespostaSegundos',
  'transferirParaHumano',
  'mensagemTransferencia',
  'usarEmojis',
  'assinarNome',
  'restringirTemas',
  'camposObrigatorios',
  'maxMatches',
] as const

const INCLUDE_ITENS = { itensBase: { select: { itemId: true } } } as const

@Injectable()
export class ConfiguracaoAgenteService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly chaves: ChavesIaService,
  ) {}

  // Cria a configuração padrão na primeira leitura: agente desligado, provedor com chave, modelo rápido.
  async obter(tenantId: string) {
    const provedoresComChave = await this.chaves.provedoresComChave(tenantId)
    const provedor: ProvedorIa = provedoresComChave[0] ?? 'anthropic'
    return this.prisma.configuracaoAgente.upsert({
      where: { tenantId },
      create: {
        tenantId,
        provedor,
        modelo: modeloPadrao(provedor).id,
        instrucoes: TEXTO_BASE_INSTRUCOES,
      },
      update: {},
      include: INCLUDE_ITENS,
    })
  }

  async atualizar(tenantId: string, entrada: AtualizacaoAgente) {
    const atual = await this.obter(tenantId)
    const provedoresComChave = await this.chaves.provedoresComChave(tenantId)

    const erros = validarAtualizacaoAgente(entrada, {
      provedoresComChave,
      provedorAtual: atual.provedor as ProvedorIa,
    })
    if (erros.length > 0) throw new BadRequestException(erros)

    const dados: Record<string, unknown> = {}
    for (const campo of CAMPOS_EDITAVEIS) {
      if (entrada[campo] !== undefined) dados[campo] = entrada[campo]
    }

    // Trocar de provedor sem informar modelo: usa o modelo rápido do novo provedor.
    if (entrada.provedor && entrada.provedor !== atual.provedor && entrada.modelo === undefined) {
      dados.modelo = modeloPadrao(entrada.provedor).id
    }

    return this.prisma.configuracaoAgente.update({
      where: { tenantId },
      data: dados as Prisma.ConfiguracaoAgenteUncheckedUpdateInput,
      include: INCLUDE_ITENS,
    })
  }

  // Substitui o conjunto de itens da base que o agente pode usar.
  async definirItens(tenantId: string, itemIds: string[]): Promise<string[]> {
    const configuracao = await this.obter(tenantId)
    const unicos = [...new Set(itemIds)]

    if (unicos.length > 0) {
      const encontrados = await this.prisma.baseConhecimentoItem.count({
        where: { tenantId, id: { in: unicos } },
      })
      if (encontrados !== unicos.length) {
        throw new BadRequestException('Algum item da base não existe para esta imobiliária.')
      }
    }

    await this.prisma.$transaction([
      this.prisma.agenteItemBase.deleteMany({ where: { configuracaoId: configuracao.id } }),
      this.prisma.agenteItemBase.createMany({
        data: unicos.map((itemId) => ({ configuracaoId: configuracao.id, itemId })),
      }),
    ])
    return unicos
  }

  async registrarFalha(tenantId: string, mensagem: string): Promise<void> {
    await this.obter(tenantId)
    await this.prisma.configuracaoAgente.update({
      where: { tenantId },
      data: { ultimaFalhaEm: new Date(), ultimaFalhaMensagem: mensagem },
    })
  }

  async limparFalha(tenantId: string): Promise<void> {
    await this.prisma.configuracaoAgente.updateMany({
      where: { tenantId, ultimaFalhaEm: { not: null } },
      data: { ultimaFalhaEm: null, ultimaFalhaMensagem: null },
    })
  }
}
