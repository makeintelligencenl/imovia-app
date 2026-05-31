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
        cidadeId: dto.cidadeId,
        estado: dto.estado,
        cep: dto.cep,
        codigoOrigem: dto.codigoOrigem,
        latitude: dto.latitude,
        longitude: dto.longitude,
        descricao: dto.descricao,
        tenantId,
      },
      include: { tipo: true, cidade: { include: { estado: true } } },
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
      include: { tipo: true, cidade: { include: { estado: true } } },
      orderBy: { createdAt: 'desc' },
    })
  }

  async findById(tenantId: string, id: string) {
    const imovel = await this.prisma.imovel.findFirst({
      where: { id, tenantId },
      include: { tipo: true, cidade: { include: { estado: true } } },
    })
    if (!imovel) throw new NotFoundException('Imóvel não encontrado')
    return imovel
  }

  async update(tenantId: string, id: string, data: Partial<CreateImovelDto>) {
    await this.findById(tenantId, id)
    const { tipoId, finalidade, ...rest } = data
    const updated = await this.prisma.imovel.update({
      where: { id },
      data: {
        ...rest,
        ...(tipoId     && { tipoId }),
        ...(finalidade && { finalidade: finalidade as Finalidade }),
      },
      include: { tipo: true, cidade: { include: { estado: true } } },
    })

    // BUG #5: Re-executa matching após atualização de preço/cidade/tipo/área.
    // - Cria novos matches para perfis que agora são compatíveis
    // - Move para "Encerrado" os matches que deixaram de ser compatíveis (sem deletar — mantém histórico)
    if (updated.status === 'DISPONIVEL') {
      this.matchingService
        .executarMatching(tenantId, id)
        .catch((err: Error) => this.logger.error(`[update] Erro no matching do imóvel ${id}: ${err.message}`))

      this.matchingService
        .invalidarMatchesIncompativeis(tenantId, id)
        .catch((err: Error) => this.logger.error(`[update] Erro ao invalidar matches do imóvel ${id}: ${err.message}`))
    }

    return updated
  }

  async remove(tenantId: string, id: string) {
    await this.findById(tenantId, id)
    // BUG #6: Envolve deleção de matches e do imóvel em uma única transação.
    // Se o delete do imóvel falhar, os matches não são removidos (sem dados órfãos).
    return this.prisma.$transaction(async (tx) => {
      await tx.match.deleteMany({ where: { imovelId: id } })
      return tx.imovel.delete({ where: { id } })
    })
  }

  async updateStatus(tenantId: string, id: string, status: string) {
    await this.findById(tenantId, id)
    return this.prisma.imovel.update({
      where: { id },
      data: { status: status as StatusImovel },
      include: { tipo: true, cidade: { include: { estado: true } } },
    })
  }
}
