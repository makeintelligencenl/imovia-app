import { Injectable, Logger } from '@nestjs/common'
import { BaseConhecimentoService } from '../base-conhecimento/base-conhecimento.service'
import { ChavesIaService } from './chaves-ia.service'
import { ConfiguracaoAgenteService } from './configuracao-agente.service'
import { PrismaService } from '../prisma/prisma.service'
import { WhatsappClientService } from '../whatsapp/whatsapp-client.service'
import { aplicarAssinatura, interpretarResposta, montarPromptSistema } from './agente-prompt.util'
import { DEFINICOES_FERRAMENTAS } from './ferramentas-agente.util'
import { FerramentasAgenteService } from './ferramentas-agente.service'
import { AnthropicClientService } from './llm/anthropic-client.service'
import { ClienteLlm, ErroLlm, comNovaTentativa } from './llm/llm-client'
import { OpenAiClientService } from './llm/openai-client.service'
import { ProvedorIa } from './modelos-agente'

export const TEXTO_TRANSFERENCIA_PADRAO = 'Vou chamar um atendente para continuar com você. Um momento, por favor.'
export const TEXTO_MIDIA =
  'Não consigo ouvir áudios nem ver arquivos por aqui. Pode escrever sua dúvida em texto?'
export const LIMITE_HISTORICO = 20

export type MensagemHistorico = {
  direcao: 'ENTRADA' | 'SAIDA'
  tipo: string
  texto: string | null
}

// Mensagens do cliente depois da última resposta do agente ou de um humano.
export function pendentesDoCliente<T extends MensagemHistorico>(historico: T[]): T[] {
  const pendentes: T[] = []
  for (let i = historico.length - 1; i >= 0; i--) {
    if (historico[i].direcao === 'SAIDA') break
    pendentes.unshift(historico[i])
  }
  return pendentes
}

// Histórico no formato do modelo. Mídia antiga vira um marcador de texto.
export function historicoParaModelo(historico: MensagemHistorico[]): { papel: 'user' | 'assistant'; texto: string }[] {
  return historico
    .map((m) => ({
      papel: (m.direcao === 'ENTRADA' ? 'user' : 'assistant') as 'user' | 'assistant',
      texto: m.tipo === 'text' ? (m.texto ?? '').trim() : `[${m.tipo}]`,
    }))
    .filter((m) => m.texto.length > 0)
}

@Injectable()
export class AgenteAtendimentoService {
  private readonly logger = new Logger(AgenteAtendimentoService.name)
  private readonly temporizadores = new Map<string, NodeJS.Timeout>()
  private readonly versoes = new Map<string, number>()

  constructor(
    private readonly prisma: PrismaService,
    private readonly configuracao: ConfiguracaoAgenteService,
    private readonly chaves: ChavesIaService,
    private readonly base: BaseConhecimentoService,
    private readonly ferramentas: FerramentasAgenteService,
    private readonly anthropic: AnthropicClientService,
    private readonly openai: OpenAiClientService,
    private readonly whatsapp: WhatsappClientService,
  ) {}

  // Chamado pelo webhook a cada mensagem nova do cliente. Só a última agendada responde.
  async agendarResposta(tenantId: string, conversaId: string, telefone: string): Promise<void> {
    const cfg = await this.configuracao.obter(tenantId)
    if (!cfg.ativo) return

    const versao = this.proximaVersao(conversaId)
    this.cancelarTemporizador(conversaId)
    const timer = setTimeout(() => {
      this.temporizadores.delete(conversaId)
      this.responder(tenantId, conversaId, telefone, versao).catch((erro) => {
        this.logger.error(`Falha no atendimento: ${(erro as Error).name}`)
      })
    }, cfg.tempoRespostaSegundos * 1000)
    this.temporizadores.set(conversaId, timer)
  }

  // Usado quando um humano responde pelo celular: a resposta agendada não deve mais sair.
  cancelarPendencia(conversaId: string): void {
    this.cancelarTemporizador(conversaId)
    this.proximaVersao(conversaId)
  }

  async responder(tenantId: string, conversaId: string, telefone: string, versao: number): Promise<void> {
    if (this.versoes.get(conversaId) !== versao) return

    const conversa = await this.prisma.conversaWhatsapp.findFirst({ where: { id: conversaId, tenantId } })
    if (!conversa || conversa.humanTalk) return

    const cfg = await this.configuracao.obter(tenantId)
    if (!cfg.ativo) return

    const historico = (
      await this.prisma.mensagemWhatsapp.findMany({
        where: { conversaId },
        orderBy: { criadaEm: 'desc' },
        take: LIMITE_HISTORICO,
      })
    ).reverse()

    const pendentes = pendentesDoCliente(historico)
    if (pendentes.length === 0) return

    try {
      if (pendentes.some((m) => m.tipo !== 'text')) {
        await this.responderMidia(tenantId, conversaId, telefone, cfg, versao)
        return
      }

      const pergunta = pendentes.map((m) => m.texto ?? '').join('\n')
      const apiKey = await this.chaves.obterChave(tenantId, cfg.provedor as ProvedorIa)
      if (!apiKey) {
        await this.configuracao.registrarFalha(tenantId, 'Cadastre a chave do provedor de IA escolhido.')
        return
      }

      const trechos = await this.base.buscarTrechos(
        tenantId,
        cfg.itensBase.map((i) => i.itemId),
        pergunta,
      )
      const sistema = montarPromptSistema({
        nome: cfg.nome,
        instrucoes: cfg.instrucoes,
        transferirParaHumano: cfg.transferirParaHumano,
        usarEmojis: cfg.usarEmojis,
        restringirTemas: cfg.restringirTemas,
        mensagemTransferencia: cfg.mensagemTransferencia,
        contexto: trechos,
      })

      const cliente: ClienteLlm = cfg.provedor === 'anthropic' ? this.anthropic : this.openai
      const bruto = await comNovaTentativa(() =>
        cliente.gerarComFerramentas(
          {
            modelo: cfg.modelo,
            apiKey,
            sistema,
            mensagens: historicoParaModelo(historico),
            ferramentas: DEFINICOES_FERRAMENTAS,
          },
          (chamada) =>
            this.ferramentas.executar(
              {
                tenantId,
                telefone,
                nomeContato: conversa.nomeContato,
                camposObrigatorios: cfg.camposObrigatorios,
                maxMatches: cfg.maxMatches,
              },
              chamada,
            ),
        ),
      )

      // Conferência antes de enviar: nova mensagem chegou ou um humano assumiu durante a geração.
      const atual = await this.prisma.conversaWhatsapp.findFirst({ where: { id: conversaId, tenantId } })
      if (this.versoes.get(conversaId) !== versao || !atual || atual.humanTalk) return

      const resultado = interpretarResposta(bruto, cfg.transferirParaHumano)
      if (resultado.tipo === 'transferencia') {
        const base = resultado.texto ?? (cfg.mensagemTransferencia?.trim() || TEXTO_TRANSFERENCIA_PADRAO)
        await this.enviarECompletar(tenantId, conversaId, telefone, aplicarAssinatura(base, cfg.nome, cfg.assinarNome))
        await this.transferir(tenantId, conversaId)
      } else if (resultado.texto) {
        await this.enviarECompletar(tenantId, conversaId, telefone, aplicarAssinatura(resultado.texto, cfg.nome, cfg.assinarNome))
      }
      await this.configuracao.limparFalha(tenantId)
    } catch (erro) {
      if (erro instanceof ErroLlm) {
        await this.configuracao.registrarFalha(tenantId, erro.message)
        return
      }
      this.logger.error(`Falha ao responder: ${(erro as Error).name}`)
      await this.configuracao.registrarFalha(tenantId, 'Falha inesperada ao gerar a resposta. Veja os logs do servidor.')
    }
  }

  // Mídia: sem leitura de áudio ou imagem. Com transferência ligada, passa para um humano.
  private async responderMidia(
    tenantId: string,
    conversaId: string,
    telefone: string,
    cfg: { transferirParaHumano: boolean; mensagemTransferencia: string | null; nome: string; assinarNome: boolean },
    versao: number,
  ): Promise<void> {
    if (this.versoes.get(conversaId) !== versao) return
    if (cfg.transferirParaHumano) {
      const base = cfg.mensagemTransferencia?.trim() || TEXTO_TRANSFERENCIA_PADRAO
      await this.enviarECompletar(tenantId, conversaId, telefone, aplicarAssinatura(base, cfg.nome, cfg.assinarNome))
      await this.transferir(tenantId, conversaId)
    } else {
      await this.enviarECompletar(tenantId, conversaId, telefone, aplicarAssinatura(TEXTO_MIDIA, cfg.nome, cfg.assinarNome))
    }
  }

  // Envia pela Meta e grava a mensagem com o id devolvido. Só então a mensagem existe no CRM.
  private async enviarECompletar(tenantId: string, conversaId: string, telefone: string, texto: string): Promise<void> {
    const waMessageId = await this.whatsapp.enviarTexto(tenantId, telefone, texto)
    await this.prisma.mensagemWhatsapp.create({
      data: {
        conversaId,
        waMessageId,
        direcao: 'SAIDA',
        tipo: 'text',
        texto,
        criadaEm: new Date(),
      },
    })
  }

  private async transferir(tenantId: string, conversaId: string): Promise<void> {
    await this.prisma.conversaWhatsapp.updateMany({
      where: { id: conversaId, tenantId },
      data: { humanTalk: true, assumidoPorId: null },
    })
  }

  private proximaVersao(conversaId: string): number {
    const versao = (this.versoes.get(conversaId) ?? 0) + 1
    this.versoes.set(conversaId, versao)
    return versao
  }

  private cancelarTemporizador(conversaId: string): void {
    const timer = this.temporizadores.get(conversaId)
    if (timer) clearTimeout(timer)
    this.temporizadores.delete(conversaId)
  }
}
