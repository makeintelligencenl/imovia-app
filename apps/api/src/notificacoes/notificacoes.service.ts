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
    const cliente = perfil.cliente ?? perfil  // compatibilidade

    if (cliente.email) {
      promises.push(
        this.emailService.enviarMatchEmail(cliente.email, cliente.nome ?? cliente.clienteNome, imovel),
      )
    }

    if (cliente.whatsapp) {
      promises.push(
        this.whatsappService.enviarMatchWhatsapp(cliente.whatsapp, cliente.nome ?? cliente.clienteNome, imovel),
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
