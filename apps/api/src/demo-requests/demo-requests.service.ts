import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { TurnstileService } from '../common/turnstile.service'
import { NotificacoesService } from '../notificacoes/notificacoes.service'
import { CreateDemoRequestDto } from './dto/create-demo-request.dto'

@Injectable()
export class DemoRequestsService {
  constructor(
    private prisma: PrismaService,
    private turnstile: TurnstileService,
    private notificacoes: NotificacoesService,
  ) {}

  async criar(dto: CreateDemoRequestDto) {
    await this.turnstile.verify(dto.cfTurnstileToken)

    const demoRequest = await this.prisma.demoRequest.create({
      data: {
        nome:     dto.nome,
        email:    dto.email,
        telefone: dto.telefone,
        empresa:  dto.empresa,
      },
    })

    await this.notificacoes.enviarNotificacaoDemoRequest({
      nome:     dto.nome,
      email:    dto.email,
      telefone: dto.telefone,
      empresa:  dto.empresa,
    })

    return { id: demoRequest.id }
  }
}
