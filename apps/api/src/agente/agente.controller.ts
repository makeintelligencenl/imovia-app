import { BadRequestException, Body, Controller, Get, Patch, Post, Put, Req, UseGuards } from '@nestjs/common'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { Roles, RolesGuard } from '../auth/guards/roles.guard'
import { AgenteAtendimentoService, MensagemTeste } from './agente-atendimento.service'
import { AtualizacaoAgente } from './agente-validacao.util'
import { ChavesIaService } from './chaves-ia.service'
import { ConfiguracaoAgenteService } from './configuracao-agente.service'
import { MODELOS_POR_PROVEDOR } from './modelos-agente'

type RequisicaoAutenticada = { user: { tenantId: string } }

@Controller('agente')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AgenteController {
  constructor(
    private readonly configuracao: ConfiguracaoAgenteService,
    private readonly chaves: ChavesIaService,
    private readonly atendimento: AgenteAtendimentoService,
  ) {}

  // Conversa de teste: usa a configuração salva e não envia nem grava nada.
  @Post('testar')
  testar(@Req() req: RequisicaoAutenticada, @Body() corpo: { mensagens?: unknown }) {
    const mensagens = corpo?.mensagens
    const valido =
      Array.isArray(mensagens) &&
      mensagens.length > 0 &&
      mensagens.length <= 30 &&
      mensagens.every(
        (m) =>
          typeof m === 'object' && m !== null &&
          ((m as MensagemTeste).papel === 'cliente' || (m as MensagemTeste).papel === 'agente') &&
          typeof (m as MensagemTeste).texto === 'string',
      )
    if (!valido) throw new BadRequestException('Envie mensagens com papel "cliente" ou "agente" e texto.')
    return this.atendimento.testar(req.user.tenantId, mensagens as MensagemTeste[])
  }

  @Get()
  async obter(@Req() req: RequisicaoAutenticada) {
    const cfg = await this.configuracao.obter(req.user.tenantId)
    const provedoresDisponiveis = await this.chaves.provedoresComChave(req.user.tenantId)
    return this.formatar(cfg, provedoresDisponiveis)
  }

  @Patch()
  async atualizar(@Req() req: RequisicaoAutenticada, @Body() dto: AtualizacaoAgente) {
    const cfg = await this.configuracao.atualizar(req.user.tenantId, dto)
    const provedoresDisponiveis = await this.chaves.provedoresComChave(req.user.tenantId)
    return this.formatar(cfg, provedoresDisponiveis)
  }

  @Put('itens')
  async definirItens(@Req() req: RequisicaoAutenticada, @Body() corpo: { itemIds?: unknown }) {
    if (!Array.isArray(corpo?.itemIds) || corpo.itemIds.some((id) => typeof id !== 'string')) {
      throw new BadRequestException('Envie itemIds como uma lista de textos.')
    }
    const itemIds = await this.configuracao.definirItens(req.user.tenantId, corpo.itemIds as string[])
    return { itemIds }
  }

  // Resposta da tela: sem chaves de IA, só os provedores que têm chave e o catálogo de modelos.
  private formatar(
    cfg: {
      itensBase: { itemId: string }[]
      ultimaFalhaEm: Date | null
      ultimaFalhaMensagem: string | null
    } & Record<string, unknown>,
    provedoresDisponiveis: string[],
  ) {
    const { itensBase, ultimaFalhaEm, ultimaFalhaMensagem, ...resto } = cfg
    return {
      ...resto,
      itemIds: itensBase.map((i) => i.itemId),
      provedoresDisponiveis,
      catalogoModelos: MODELOS_POR_PROVEDOR,
      ultimaFalha: ultimaFalhaEm ? { em: ultimaFalhaEm, mensagem: ultimaFalhaMensagem } : null,
    }
  }
}
