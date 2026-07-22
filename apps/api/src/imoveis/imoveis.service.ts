import { Injectable, NotFoundException, InternalServerErrorException, Logger } from '@nestjs/common'
import { Prisma, Finalidade, StatusImovel } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'
import { MatchingService } from '../matching/matching.service'
import { GeocodingService } from './geocoding.service'
import { CreateImovelDto } from './dto/create-imovel.dto'

@Injectable()
export class ImoveisService {
  private readonly logger = new Logger(ImoveisService.name)

  constructor(
    private prisma: PrismaService,
    private matchingService: MatchingService,
    private geocoding: GeocodingService,
  ) {}

  async create(tenantId: string, dto: CreateImovelDto) {
    let latitude  = dto.latitude
    let longitude = dto.longitude
    if (dto.cep && (latitude == null || longitude == null)) {
      const coords = await this.geocoding.geocodificarCep(dto.cep)
      if (coords) { latitude = coords.latitude; longitude = coords.longitude }
    }

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
        latitude,
        longitude,
        descricao: dto.descricao,
        tenantId,
      },
      include: { tipo: true, cidade: { include: { estado: true } } },
    })

    let matchesEncontrados = 0
    try {
      const resultado = await this.matchingService.executarMatching(tenantId, imovel.id)
      matchesEncontrados = resultado.matchesEncontrados
    } catch (err: any) {
      this.logger.error(`[create] Matching falhou para imóvel ${imovel.id}: ${err.message}`, err.stack)
    }

    return { ...imovel, matchesEncontrados }
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

    if (data.cep && data.latitude == null && data.longitude == null) {
      const coords = await this.geocoding.geocodificarCep(data.cep)
      if (coords) { rest.latitude = coords.latitude; rest.longitude = coords.longitude }
    }

    const updated = await this.prisma.imovel.update({
      where: { id },
      data: {
        ...rest,
        ...(tipoId     && { tipoId }),
        ...(finalidade && { finalidade: finalidade as Finalidade }),
      },
      include: { tipo: true, cidade: { include: { estado: true } } },
    })

    // BUG #5 FIX: executa matching e invalidação SEQUENCIALMENTE via async IIFE.
    // Antes: as duas chamadas disparavam em paralelo — invalidarMatchesIncompativeis
    // podia encerrar matches recém-criados por executarMatching nessa mesma requisição.
    // Agora: primeiro cria novos matches, depois encerra os incompatíveis.
    if (updated.status === 'DISPONIVEL') {
      void (async () => {
        try {
          await this.matchingService.executarMatching(tenantId, id)
        } catch (err: any) {
          this.logger.error(`[update] Erro no matching do imóvel ${id}: ${err.message}`, err.stack)
        }
        try {
          await this.matchingService.invalidarMatchesIncompativeis(tenantId, id)
        } catch (err: any) {
          this.logger.error(`[update] Erro ao invalidar matches do imóvel ${id}: ${err.message}`, err.stack)
        }
        // Recalcula leadScore pois preço/área/bairro/quartos podem ter mudado
        try {
          await this.matchingService.recalcularLeadScoresPorImovel(tenantId, id)
        } catch (err: any) {
          this.logger.error(`[update] Erro ao recalcular leadScore do imóvel ${id}: ${err.message}`, err.stack)
        }
      })()
    }

    return updated
  }

  async remove(tenantId: string, id: string) {
    await this.findById(tenantId, id)
    // BUG #6 FIX: captura erros da transação e lança exceções HTTP com mensagens
    // descritivas em vez de deixar o erro Prisma vazar como 500 genérico.
    try {
      return await this.prisma.$transaction(async (tx) => {
        const matchCount = await tx.match.count({ where: { imovelId: id } })
        await tx.match.deleteMany({ where: { imovelId: id } })
        const deleted = await tx.imovel.delete({ where: { id } })
        this.logger.log(`Imóvel ${id} removido — ${matchCount} match(es) excluídos junto`)
        return deleted
      })
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError) {
        // P2003 = FK constraint; P2025 = registro não encontrado na tx
        const hint =
          err.code === 'P2003'
            ? 'Existem registros vinculados que impedem a exclusão.'
            : `Código Prisma ${err.code}.`
        throw new InternalServerErrorException(`Não foi possível remover o imóvel. ${hint}`)
      }
      throw err
    }
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
