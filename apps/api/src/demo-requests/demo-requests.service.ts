import { Injectable, NotFoundException, ConflictException } from '@nestjs/common'
import { ClsService } from 'nestjs-cls'
import { PrismaService } from '../prisma/prisma.service'
import { TurnstileService } from '../common/turnstile.service'
import { NotificacoesService } from '../notificacoes/notificacoes.service'
import { PipelineService } from '../pipeline/pipeline.service'
import { TENANT_ID_KEY } from '../auth/interceptors/tenant.interceptor'
import { CreateDemoRequestDto } from './dto/create-demo-request.dto'
import * as bcrypt from 'bcryptjs'
import { randomBytes } from 'crypto'

@Injectable()
export class DemoRequestsService {
  constructor(
    private prisma: PrismaService,
    private turnstile: TurnstileService,
    private notificacoes: NotificacoesService,
    private pipeline: PipelineService,
    private cls: ClsService,
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

    this.cls.set(TENANT_ID_KEY, tenant.id)
    await this.pipeline.criarEtapasPadrao(tenant.id)

    // Gera senha temporária única por tenant (criptograficamente segura)
    const senhaTemporaria = randomBytes(16).toString('hex')  // 32 chars hex
    const passwordHash = await bcrypt.hash(senhaTemporaria, 12)

    await this.prisma.user.create({
      data: {
        name:               demo.nome,
        email:              demo.email,
        passwordHash,
        role:               'ADMIN',
        tenantId:           tenant.id,
        forcePasswordChange: true,
      },
    })

    // Envia credenciais por email — senha NÃO é retornada no body da resposta
    await this.notificacoes.enviarCredenciaisAcesso({
      nome:    demo.nome,
      email:   demo.email,
      senha:   senhaTemporaria,
      empresa: demo.empresa,
    })

    await this.prisma.demoRequest.update({
      where: { id },
      data:  { aprovadoEm: new Date() },
    })

    return {
      tenant:     { id: tenant.id, name: tenant.name, slug },
      adminEmail: demo.email,
      // senha omitida intencionalmente — enviada por email ao solicitante
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
