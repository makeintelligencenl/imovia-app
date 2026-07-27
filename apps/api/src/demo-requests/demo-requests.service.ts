import { Injectable, NotFoundException, ConflictException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { TurnstileService } from '../common/turnstile.service'
import { NotificacoesService } from '../notificacoes/notificacoes.service'
import { PipelineService } from '../pipeline/pipeline.service'
import { CreateDemoRequestDto } from './dto/create-demo-request.dto'
import * as bcrypt from 'bcryptjs'

@Injectable()
export class DemoRequestsService {
  constructor(
    private prisma: PrismaService,
    private turnstile: TurnstileService,
    private notificacoes: NotificacoesService,
    private pipeline: PipelineService,
  ) {}

  async listar() {
    return this.prisma.demoRequest.findMany({
      orderBy: { createdAt: 'desc' },
    })
  }

  async excluir(id: string) {
    const demo = await this.prisma.demoRequest.findUnique({ where: { id } })
    if (!demo) throw new NotFoundException('Solicitação não encontrada')
    await this.prisma.demoRequest.delete({ where: { id } })
    return { ok: true }
  }

  async aprovar(id: string) {
    const demo = await this.prisma.demoRequest.findUnique({ where: { id } })
    if (!demo) throw new NotFoundException('Solicitação não encontrada')

    // Gera slug a partir do nome da empresa
    const slug = demo.empresa
      .toLowerCase()
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')

    const slugExists = await this.prisma.tenant.findUnique({ where: { slug } })
    if (slugExists) throw new ConflictException(`Slug "${slug}" já em uso — ajuste o nome da empresa`)

    const tenant = await this.prisma.tenant.create({
      data: { name: demo.empresa, slug, email: demo.email, telefone: demo.telefone },
    })

    await this.pipeline.criarEtapasPadrao(tenant.id)

    const senhaTemporaria = 'Imovia@2026'
    const passwordHash = await bcrypt.hash(senhaTemporaria, 12)

    await this.prisma.user.create({
      data: {
        name:         demo.nome,
        email:        demo.email,
        passwordHash,
        role:         'ADMIN',
        tenantId:     tenant.id,
      },
    })

    return {
      tenant: { id: tenant.id, name: tenant.name, slug },
      adminEmail: demo.email,
      senhaTemporaria,
    }
  }

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
