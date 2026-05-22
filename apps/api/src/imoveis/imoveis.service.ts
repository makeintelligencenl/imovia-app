import { Injectable, NotFoundException, Logger } from '@nestjs/common'
import { Finalidade, StatusImovel } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'
import { MatchingService } from '../matching/matching.service'
import { CreateImovelDto } from './dto/create-imovel.dto'

@Injectable()
export class ImoveisService {
  private readonly logger = new Logger(ImoveisService.name)

  constructor(
    private prisma: PrismaService,
    private matchingService: MatchingService,
  ) {}

  async create(tenantId: string, dto: CreateImovelDto) {
    const imovel = await this.prisma.imovel.create({
      data: {
        titulo: dto.titulo,
        tipoId: dto.tipoId,
        finalidade: dto.finalidade as Finalidade,
        preco: dto.preco,
        areaM2: dto.areaM2,
        quartos: dto.quartos,
        banheiros: dto.banheiros,
        vagas: dto.vagas,
        bairro: dto.bairro,
        cidade: dto.cidade,
        estado: dto.estado,
        cep: dto.cep,
        codigoOrigem: dto.codigoOrigem,
        latitude: dto.latitude,
        longitude: dto.longitude,
        descricao: dto.descricao,
        tenantId,
      },
      include: { tipo: true },
    })

    // Fire-and-forget: dispara matching sem bloquear a resposta
    this.matchingService
      .executarMatching(tenantId, imovel.id)
      .catch((err: Error) => this.logger.error(`Erro no matching do imóvel ${imovel.id}: ${err.message}`))

    return imovel
  }

  async findAll(tenantId: string, filters?: { tipoId?: string; finalidade?: string; status?: string }) {
    return this.prisma.imovel.findMany({
      where: {
        tenantId,
        ...(filters?.tipoId && { tipoId: filters.tipoId }),
        ...(filters?.finalidade && { finalidade: filters.finalidade as Finalidade }),
        ...(filters?.status && { status: filters.status as StatusImovel }),
      },
      include: { tipo: true },
      orderBy: { createdAt: 'desc' },
    })
  }

  async findById(tenantId: string, id: string) {
    const imovel = await this.prisma.imovel.findFirst({
      where: { id, tenantId },
      include: { tipo: true },
    })
    if (!imovel) throw new NotFoundException('Imóvel não encontrado')
    return imovel
  }

  async update(tenantId: string, id: string, data: Partial<CreateImovelDto>) {
    await this.findById(tenantId, id)
    const { tipoId, finalidade, ...rest } = data
    return this.prisma.imovel.update({
      where: { id },
      data: {
        ...rest,
        ...(tipoId && { tipoId }),
        ...(finalidade && { finalidade: finalidade as Finalidade }),
      },
      include: { tipo: true },
    })
  }

  async remove(tenantId: string, id: string) {
    await this.findById(tenantId, id)
    // Remove matches vinculados antes de excluir o imóvel
    await this.prisma.match.deleteMany({ where: { imovelId: id } })
    return this.prisma.imovel.delete({ where: { id } })
  }

  async updateStatus(tenantId: string, id: string, status: string) {
    await this.findById(tenantId, id)
    return this.prisma.imovel.update({
      where: { id },
      data: { status: status as StatusImovel },
      include: { tipo: true },
    })
  }
}
