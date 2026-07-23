import { Injectable, Logger } from '@nestjs/common'
import { EmailService } from './email.service'
import { WhatsappService } from './whatsapp.service'
import { PerfilComCliente, ImovelInput } from '../matching/types'

@Injectable()
export class NotificacoesService {
  private readonly logger = new Logger(NotificacoesService.name)

  constructor(
    private emailService: EmailService,
    private whatsappService: WhatsappService,
  ) {}

  async enviarNotificacaoMatch(perfil: PerfilComCliente, imovel: ImovelInput) {
    const promises: Promise<void>[] = []
    const { cliente } = perfil

    if (cliente.email) {
      promises.push(
        this.emailService.enviarMatchEmail(cliente.email, cliente.nome ?? '', imovel),
      )
    }

    if (cliente.telefone) {
      promises.push(
        this.whatsappService.enviarMatchWhatsapp(cliente.telefone, cliente.nome ?? '', imovel),
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
