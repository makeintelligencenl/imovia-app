import { Injectable, Logger } from '@nestjs/common'
import { EmailService } from './email.service'
import { WhatsappService } from './whatsapp.service'

@Injectable()
export class NotificacoesService {
  private readonly logger = new Logger(NotificacoesService.name)

  constructor(
    private emailService: EmailService,
    private whatsappService: WhatsappService,
  ) {}

  async enviarNotificacaoMatch(perfil: any, imovel: any) {
    const promises: Promise<void>[] = []

    if (perfil.clienteEmail) {
      promises.push(
        this.emailService.enviarMatchEmail(perfil.clienteEmail, perfil.clienteNome, imovel),
      )
    }

    if (perfil.clienteWhatsapp) {
      promises.push(
        this.whatsappService.enviarMatchWhatsapp(perfil.clienteWhatsapp, perfil.clienteNome, imovel),
      )
    }

    const results = await Promise.allSettled(promises)
    results.forEach((result, i) => {
      if (result.status === 'rejected') {
        this.logger.error(`Falha ao enviar notificação [canal ${i}]: ${result.reason}`)
      }
    })
  }
}
