import { Module } from '@nestjs/common'
import { ConfiguracaoWhatsappService } from './configuracao-whatsapp.service'
import { ConexaoWhatsappService } from './conexao-whatsapp.service'
import { WhatsappClientController } from './whatsapp-client.controller'
import { WhatsappClientService } from './whatsapp-client.service'
import { WhatsappWebhookController } from './whatsapp-webhook.controller'

@Module({
  controllers: [WhatsappClientController, WhatsappWebhookController],
  providers: [WhatsappClientService, ConfiguracaoWhatsappService, ConexaoWhatsappService],
  exports: [WhatsappClientService, ConfiguracaoWhatsappService, ConexaoWhatsappService],
})
export class WhatsappModule {}
