import { Injectable, Logger } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { MatchingService } from '../matching/matching.service'
import { ChamadaFerramenta } from './llm/llm-client'
import {
  DadosPerfil,
  FERRAMENTA_BUSCAR_IMOVEIS,
  FERRAMENTA_SALVAR_DADOS,
  camposFaltando,
  formatarImoveis,
  lerFinalidade,
  normalizarTelefone,
} from './ferramentas-agente.util'

export type ContextoFerramenta = {
  tenantId: string
  telefone: string
  nomeContato: string | null
  camposObrigatorios: string[]
  maxMatches: number
}

function texto(v: unknown): string | undefined {
  return typeof v === 'string' && v.trim() ? v.trim() : undefined
}
function numero(v: unknown): number | undefined {
  return typeof v === 'number' && Number.isFinite(v) ? v : undefined
}
function listaTextos(v: unknown): string[] | undefined {
  if (!Array.isArray(v)) return undefined
  const itens = v.filter((x): x is string => typeof x === 'string' && x.trim() !== '').map((x) => x.trim())
  return itens.length > 0 ? itens : undefined
}

@Injectable()
export class FerramentasAgenteService {
  private readonly logger = new Logger(FerramentasAgenteService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly matching: MatchingService,
  ) {}

  // Nunca lança: o modelo recebe a mensagem de erro e continua a conversa.
  async executar(ctx: ContextoFerramenta, chamada: ChamadaFerramenta): Promise<string> {
    try {
      if (chamada.nome === FERRAMENTA_BUSCAR_IMOVEIS) return await this.buscarImoveis(ctx)
      if (chamada.nome === FERRAMENTA_SALVAR_DADOS) return await this.salvarDados(ctx, chamada.argumentos)
      return 'Ferramenta desconhecida.'
    } catch (erro) {
      // Log sem conteúdo da conversa.
      this.logger.error(`Falha na ferramenta ${chamada.nome}: ${(erro as Error).name}`)
      return 'Não foi possível concluir essa ação agora.'
    }
  }

  private async buscarImoveis(ctx: ContextoFerramenta): Promise<string> {
    const perfil = await this.perfilDoContato(ctx)
    if (!perfil) return 'O perfil deste cliente ainda não foi cadastrado. Colete os dados obrigatórios antes.'

    await this.matching.executarMatchingParaPerfil(ctx.tenantId, perfil.id, ctx.maxMatches)
    const matches = await this.prisma.match.findMany({
      where: { tenantId: ctx.tenantId, perfilId: perfil.id },
      orderBy: { leadScore: 'desc' },
      take: ctx.maxMatches,
      include: {
        imovel: {
          select: { titulo: true, preco: true, areaM2: true, quartos: true, bairro: true, urlImovel: true, cidade: { select: { nome: true } } },
        },
      },
    })
    return formatarImoveis(matches.map((m) => m.imovel))
  }

  private async salvarDados(ctx: ContextoFerramenta, args: Record<string, unknown>): Promise<string> {
    const novos: DadosPerfil = {
      finalidade: lerFinalidade(args.finalidade),
      tipo: texto(args.tipo),
      cidade: texto(args.cidade),
      precoMin: numero(args.precoMin),
      precoMax: numero(args.precoMax),
      areaMin: numero(args.areaMin),
      quartosMin: numero(args.quartosMin),
      bairros: listaTextos(args.bairros),
    }

    const tipoRegistro = novos.tipo
      ? await this.prisma.tipoImovel.findFirst({ where: { nome: { equals: novos.tipo, mode: 'insensitive' }, ativo: true } })
      : null
    if (novos.tipo && !tipoRegistro) {
      return `Não reconheço o tipo "${novos.tipo}". Pergunte ao cliente qual tipo de imóvel ele procura.`
    }

    const cidadeRegistro = novos.cidade
      ? await this.prisma.cidade.findFirst({ where: { nome: { equals: novos.cidade, mode: 'insensitive' } } })
      : null
    if (novos.cidade && !cidadeRegistro) {
      return `Não reconheço a cidade "${novos.cidade}". Confirme com o cliente o nome da cidade.`
    }

    const cliente = await this.prisma.cliente.findFirst({
      where: { tenantId: ctx.tenantId, whatsapp: normalizarTelefone(ctx.telefone) },
    })
    const perfilAtual = cliente ? await this.perfilDoContato(ctx) : null

    // Mescla: o que já estava salvo continua valendo se o cliente não mudou.
    const mesclado: DadosPerfil = {
      finalidade: novos.finalidade ?? perfilAtual?.finalidade,
      tipo: novos.tipo ?? perfilAtual?.tipos[0]?.nome,
      cidade: novos.cidade ?? (perfilAtual?.cidadeId ? 'salva' : undefined),
      precoMin: novos.precoMin ?? (perfilAtual ? perfilAtual.precoMin.toNumber() : undefined),
      precoMax: novos.precoMax ?? (perfilAtual ? perfilAtual.precoMax.toNumber() : undefined),
      areaMin: novos.areaMin ?? (perfilAtual?.areaMin ? perfilAtual.areaMin.toNumber() : undefined),
      quartosMin: novos.quartosMin ?? (perfilAtual?.quartosMin ?? undefined),
      bairros: novos.bairros ?? (perfilAtual?.bairros?.length ? perfilAtual.bairros : undefined),
    }

    const faltando = camposFaltando(mesclado, ctx.camposObrigatorios)
    if (faltando.length > 0) {
      // Nada é gravado até o perfil ter tudo o que a imobiliária exige.
      return `Dados salvos parcialmente. Ainda faltam: ${faltando.join(', ')}. Pergunte ao cliente.`
    }

    const cidadeId = cidadeRegistro?.id ?? perfilAtual?.cidadeId ?? null
    const tipoIds = tipoRegistro ? [{ id: tipoRegistro.id }] : undefined
    const dadosPerfil = {
      finalidade: mesclado.finalidade!,
      precoMin: mesclado.precoMin ?? 0,
      precoMax: mesclado.precoMax!,
      areaMin: mesclado.areaMin ?? null,
      quartosMin: mesclado.quartosMin ?? null,
      cidadeId,
      bairros: mesclado.bairros ?? [],
    }

    const nomeNovo = texto(args.nome)
    const emailNovo = texto(args.email)
    let clienteId: string
    if (cliente) {
      clienteId = cliente.id
      if (nomeNovo || emailNovo) {
        await this.prisma.cliente.update({
          where: { id: cliente.id },
          data: { ...(nomeNovo ? { nome: nomeNovo } : {}), ...(emailNovo ? { email: emailNovo } : {}) },
        })
      }
    } else {
      const criado = await this.prisma.cliente.create({
        data: {
          tenantId: ctx.tenantId,
          nome: nomeNovo ?? ctx.nomeContato ?? 'Cliente WhatsApp',
          whatsapp: normalizarTelefone(ctx.telefone),
          telefone: normalizarTelefone(ctx.telefone),
          email: emailNovo ?? null,
        },
      })
      clienteId = criado.id
    }

    const perfil = perfilAtual
      ? await this.prisma.perfilBusca.update({
          where: { id: perfilAtual.id },
          data: { ...dadosPerfil, ...(tipoIds ? { tipos: { set: tipoIds } } : {}) },
        })
      : await this.prisma.perfilBusca.create({
          data: { ...dadosPerfil, tenantId: ctx.tenantId, clienteId, ativo: true, ...(tipoIds ? { tipos: { connect: tipoIds } } : {}) },
        })

    // Ao salvar um perfil completo, os melhores imóveis viram match (até o limite configurado).
    await this.matching.executarMatchingParaPerfil(ctx.tenantId, perfil.id, ctx.maxMatches)
    return 'Dados salvos. Use buscar_imoveis para apresentar os imóveis compatíveis ao cliente.'
  }

  private perfilDoContato(ctx: ContextoFerramenta) {
    return this.prisma.perfilBusca.findFirst({
      where: {
        tenantId: ctx.tenantId,
        ativo: true,
        cliente: { whatsapp: normalizarTelefone(ctx.telefone), tenantId: ctx.tenantId },
      },
      orderBy: { createdAt: 'desc' },
      include: { tipos: { select: { nome: true, id: true } } },
    })
  }
}
