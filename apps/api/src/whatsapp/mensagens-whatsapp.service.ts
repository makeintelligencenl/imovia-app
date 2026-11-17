import { Injectable, Logger } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { AgenteAtendimentoService } from '../agente/agente-atendimento.service'
import { PrismaService } from '../prisma/prisma.service'
import { AtualizacaoDeStatus, MensagensRecebidasDoNumero, podeAvancarStatus } from './webhook-payload.util'

@Injectable()
export class MensagensWhatsappService {
  private readonly logger = new Logger(MensagensWhatsappService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly atendimento: AgenteAtendimentoService,
  ) {}

  // Vincula cada número ao tenant pela configuração salva e grava as mensagens recebidas.
  // Mensagens já gravadas (mesmo waMessageId) são ignoradas, pois a Meta pode reenviar o webhook.
  async registrarRecebidas(lotes: MensagensRecebidasDoNumero[]): Promise<number> {
    let gravadas = 0

    for (const lote of lotes) {
      const configuracao = await this.prisma.configuracaoWhatsapp.findUnique({
        where: { phoneNumberId: lote.phoneNumberId },
      })
      if (!configuracao) {
        this.logger.warn('Mensagem recebida para número sem configuração de tenant, ignorada.')
        continue
      }

      for (const msg of lote.mensagens) {
        // Gravações dentro de withTenantRLS: o webhook não tem usuário logado, então o tenant
        // vem da configuração encontrada acima.
        const conversa = await this.prisma.withTenantRLS(configuracao.tenantId, (tx) =>
          tx.conversaWhatsapp.upsert({
            where: { tenantId_telefone: { tenantId: configuracao.tenantId, telefone: msg.de } },
            create: { tenantId: configuracao.tenantId, telefone: msg.de, nomeContato: msg.nomeContato },
            update: msg.nomeContato ? { nomeContato: msg.nomeContato } : {},
          }),
        )

        try {
          await this.prisma.withTenantRLS(configuracao.tenantId, (tx) =>
            tx.mensagemWhatsapp.create({
              data: {
                conversaId: conversa.id,
                waMessageId: msg.waMessageId,
                direcao: 'ENTRADA',
                tipo: msg.tipo,
                texto: msg.texto,
                criadaEm: msg.criadaEm,
              },
            }),
          )
          gravadas++
          // Estado da conversa para a tela: não lida, janela de 24h, reabertura e fila de espera.
          await this.prisma
            .withTenantRLS(configuracao.tenantId, async (tx) => {
              await tx.conversaWhatsapp.update({
                where: { id: conversa.id },
                data: {
                  unreadCount: { increment: 1 },
                  ultimaMensagemClienteEm: msg.criadaEm,
                  resolvido: false,
                },
              })
              // Cliente esperando atendente: conversa com humano e ninguém assumiu ainda.
              await tx.conversaWhatsapp.updateMany({
                where: { id: conversa.id, humanTalk: true, assumidoPorId: null, esperandoDesde: null },
                data: { esperandoDesde: msg.criadaEm },
              })
            })
            .catch((erro: Error) => this.logger.error(`Falha ao atualizar estado da conversa: ${erro.name}`))
          // Mensagem nova: o agente agenda a resposta. Falha aqui não pode afetar o webhook.
          await this.atendimento
            .agendarResposta(configuracao.tenantId, conversa.id, msg.de)
            .catch((erro: Error) => this.logger.error(`Falha ao agendar resposta do agente: ${erro.name}`))
        } catch (erro) {
          // P2002 = waMessageId já existe (reenvio do webhook): não é erro.
          if (erro instanceof Prisma.PrismaClientKnownRequestError && erro.code === 'P2002') continue
          throw erro
        }
      }
    }

    return gravadas
  }

  // Atualiza o status das mensagens enviadas. A tabela de mensagens não depende do tenant
  // (política allow_all), e o status só avança: um aviso antigo não sobrescreve um mais recente.
  async atualizarStatusEntrega(atualizacoes: AtualizacaoDeStatus[]): Promise<number> {
    let atualizadas = 0
    for (const atualizacao of atualizacoes) {
      const mensagem = await this.prisma.mensagemWhatsapp.findUnique({
        where: { waMessageId: atualizacao.waMessageId },
        select: { id: true, direcao: true, status: true },
      })
      if (!mensagem || mensagem.direcao !== 'SAIDA') continue
      if (!podeAvancarStatus(mensagem.status, atualizacao.status)) continue

      await this.prisma.mensagemWhatsapp.update({
        where: { id: mensagem.id },
        data: { status: atualizacao.status, statusMotivo: atualizacao.motivo },
      })
      atualizadas++
    }
    return atualizadas
  }
}
