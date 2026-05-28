import { Injectable, NotFoundException, ConflictException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { PipelineService } from '../pipeline/pipeline.service'
import { CreateTenantDto } from './dto/create-tenant.dto'

@Injectable()
export class TenantsService {
  constructor(
    private prisma: PrismaService,
    private pipelineService: PipelineService,
  ) {}

  async create(dto: CreateTenantDto) {
    const exists = await this.prisma.tenant.findUnique({ where: { slug: dto.slug } })
    if (exists) throw new ConflictException('Slug já em uso')

    const tenant = await this.prisma.tenant.create({ data: dto })

    // Cria etapas padrão do pipeline para o novo tenant
    await this.pipelineService.criarEtapasPadrao(tenant.id)

    return tenant
  }

  async findById(id: string) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id } })
    if (!tenant) throw new NotFoundException('Imobiliária não encontrada')
    return tenant
  }

  async findBySlug(slug: string) {
    const tenant = await this.prisma.tenant.findUnique({ where: { slug } })
    if (!tenant) throw new NotFoundException('Imobiliária não encontrada')
    return tenant
  }

  async findAll() {
    return this.prisma.tenant.findMany({ orderBy: { createdAt: 'desc' } })
  }

  async update(id: string, data: Partial<CreateTenantDto>) {
    await this.findById(id)
    return this.prisma.tenant.update({ where: { id }, data })
  }
}
