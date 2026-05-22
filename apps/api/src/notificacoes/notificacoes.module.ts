import { Module } from '@nestjs/common'
import { NotificacoesService } from './notificacoes.service'
import { EmailService } from './email.service'
import { WhatsappService } from './whatsapp.service'

@Module({
  providers: [NotificacoesService, EmailService, WhatsappService],
  exports: [NotificacoesService],
})
export class NotificacoesModule {}
