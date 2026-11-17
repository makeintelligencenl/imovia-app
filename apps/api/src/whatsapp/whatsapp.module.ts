import { forwardRef, Module } from '@nestjs/common'
import { AgenteModule } from '../agente/agente.module'
import { IaModule } from '../ia/ia.module'
import { StorageModule } from '../storage/storage.module'
import { ConfiguracaoWhatsappService } from './configuracao-whatsapp.service'
import { ConexaoWhatsappService } from './conexao-whatsapp.service'
import { MensagensWhatsappService } from './mensagens-whatsapp.service'
import { TranscricaoAudioService } from './transcricao-audio.service'
import { WhatsappClientController } from './whatsapp-client.controller'
import { WhatsappClientService } from './whatsapp-client.service'
import { WhatsappWebhookController } from './whatsapp-webhook.controller'

@Module({
  imports: [forwardRef(() => AgenteModule), StorageModule, IaModule],
  controllers: [WhatsappClientController, WhatsappWebhookController],
  providers: [
    WhatsappClientService,
    ConfiguracaoWhatsappService,
    ConexaoWhatsappService,
    MensagensWhatsappService,
    TranscricaoAudioService,
  ],
  exports: [WhatsappClientService, ConfiguracaoWhatsappService, ConexaoWhatsappService],
})
export class WhatsappModule {}
