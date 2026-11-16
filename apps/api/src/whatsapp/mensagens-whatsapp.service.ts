import { Injectable, Logger } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'
import { MensagensRecebidasDoNumero } from './webhook-payload.util'

@Injectable()
export class MensagensWhatsappService {
  private readonly logger = new Logger(MensagensWhatsappService.name)

  constructor(private readonly prisma: PrismaService) {}

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
        const conversa = await this.prisma.conversaWhatsapp.upsert({
          where: { tenantId_telefone: { tenantId: configuracao.tenantId, telefone: msg.de } },
          create: { tenantId: configuracao.tenantId, telefone: msg.de, nomeContato: msg.nomeContato },
          update: msg.nomeContato ? { nomeContato: msg.nomeContato } : {},
        })

        try {
          await this.prisma.mensagemWhatsapp.create({
            data: {
              conversaId: conversa.id,
              waMessageId: msg.waMessageId,
              direcao: 'ENTRADA',
              tipo: msg.tipo,
              texto: msg.texto,
              criadaEm: msg.criadaEm,
            },
          })
          gravadas++
        } catch (erro) {
          // P2002 = waMessageId já existe (reenvio do webhook): não é erro.
          if (erro instanceof Prisma.PrismaClientKnownRequestError && erro.code === 'P2002') continue
          throw erro
        }
      }
    }

    return gravadas
  }
}
