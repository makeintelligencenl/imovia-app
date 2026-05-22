import { Injectable, NotFoundException, Logger } from '@nestjs/common'
import { Finalidade } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'
import { MatchingService } from '../matching/matching.service'
import { CreatePerfilDto } from './dto/create-perfil.dto'

@Injectable()
export class PerfisService {
  private readonly logger = new Logger(PerfisService.name)

  constructor(
    private prisma: PrismaService,
    private matchingService: MatchingService,
  ) {}

  async create(tenantId: string, dto: CreatePerfilDto) {
    const { tiposIds, ...rest } = dto

    const perfil = await this.prisma.perfilBusca.create({
      data: {
        ...rest,
        finalidade: dto.finalidade as Finalidade,
        bairros: rest.bairros ?? [],   // garante [] ao invés de NULL
        cidades: rest.cidades ?? [],
        tenantId,
        tipos: {
          connect: tiposIds.map((id) => ({ id })),
        },
      },
      include: { tipos: true },
    })

    // Fire-and-forget: verifica imóveis já cadastrados que combinam com o novo perfil
    this.matchingService
      .executarMatchingParaPerfil(tenantId, perfil.id)
      .catch((err: Error) =>
        this.logger.error(`Erro no matching do perfil ${perfil.id}: ${err.message}`),
      )

    return perfil
  }

  async findAll(tenantId: string) {
    return this.prisma.perfilBusca.findMany({
      where: { tenantId, ativo: true },
      include: { tipos: true },
      orderBy: { createdAt: 'desc' },
    })
  }

  async findById(tenantId: string, id: string) {
    const perfil = await this.prisma.perfilBusca.findFirst({
      where: { id, tenantId },
      include: { tipos: true },
    })
    if (!perfil) throw new NotFoundException('Perfil de busca não encontrado')
    return perfil
  }

  async findCompatíveisComImovel(tenantId: string, imovelId: string) {
    const imovel = await this.prisma.imovel.findFirst({ where: { id: imovelId, tenantId } })
    if (!imovel) throw new NotFoundException('Imóvel não encontrado')

    return this.prisma.perfilBusca.findMany({
      where: {
        tenantId,
        ativo: true,
        finalidade: imovel.finalidade,
        tipos: { some: { id: imovel.tipoId } },
        precoMin: { lte: imovel.preco },
        precoMax: { gte: imovel.preco },
        areaMin: { lte: imovel.areaM2 },
        cidades: { hasSome: [imovel.cidade] },
      },
      include: { tipos: true },
    })
  }

  async update(tenantId: string, id: string, dto: Partial<CreatePerfilDto>) {
    await this.findById(tenantId, id)
    const { tiposIds, finalidade, ...rest } = dto
    return this.prisma.perfilBusca.update({
      where: { id },
      data: {
        ...rest,
        ...(finalidade && { finalidade: finalidade as Finalidade }),
        ...(tiposIds && {
          tipos: { set: tiposIds.map((tid) => ({ id: tid })) },
        }),
      },
      include: { tipos: true },
    })
  }

  async remove(tenantId: string, id: string) {
    await this.findById(tenantId, id)
    await this.prisma.match.deleteMany({ where: { perfilId: id } })
    return this.prisma.perfilBusca.delete({ where: { id } })
  }

  async deactivate(tenantId: string, id: string) {
    await this.findById(tenantId, id)
    return this.prisma.perfilBusca.update({ where: { id }, data: { ativo: false } })
  }
}
