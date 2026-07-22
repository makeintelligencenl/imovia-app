import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { CreateEtapaDto, UpdateEtapaDto, ReorderEtapasDto } from './dto/pipeline.dto'

// Etapas padrão criadas automaticamente para novos tenants
export const ETAPAS_PADRAO = [
  { nome: 'Novo',            cor: '#6B7280', ordem: 1, tipo: 'PADRAO'    as const },
  { nome: 'Contatado',       cor: '#3B82F6', ordem: 2, tipo: 'PADRAO'    as const },
  { nome: 'Visita Agendada', cor: '#F59E0B', ordem: 3, tipo: 'VISITA'    as const },
  { nome: 'Em Negociação',   cor: '#F97316', ordem: 4, tipo: 'PADRAO'    as const },
  { nome: 'Fechado',         cor: '#10B981', ordem: 5, tipo: 'FECHADO'   as const },
  { nome: 'Encerrado',       cor: '#EF4444', ordem: 6, tipo: 'ENCERRADO' as const },
]

@Injectable()
export class PipelineService {
  constructor(private prisma: PrismaService) {}

  // ── Listar etapas do tenant ──────────────────────────────────────────────
  async listar(tenantId: string) {
    return this.prisma.pipelineEtapa.findMany({
      where: { tenantId, ativo: true },
      orderBy: { ordem: 'asc' },
    })
  }

  // ── Criar etapa ──────────────────────────────────────────────────────────
  async criar(tenantId: string, dto: CreateEtapaDto) {
    const existe = await this.prisma.pipelineEtapa.findUnique({
      where: { tenantId_nome: { tenantId, nome: dto.nome } },
    })
    if (existe) throw new BadRequestException(`Já existe uma etapa com o nome "${dto.nome}"`)

    return this.prisma.pipelineEtapa.create({
      data: { ...dto, tenantId },
    })
  }

  // ── Atualizar etapa ──────────────────────────────────────────────────────
  async atualizar(tenantId: string, id: string, dto: UpdateEtapaDto) {
    const etapa = await this.prisma.pipelineEtapa.findFirst({ where: { id, tenantId } })
    if (!etapa) throw new NotFoundException('Etapa não encontrada')

    return this.prisma.pipelineEtapa.update({
      where: { id },
      data: dto,
    })
  }

  // ── Reordenar etapas ─────────────────────────────────────────────────────
  async reordenar(tenantId: string, dto: ReorderEtapasDto) {
    const updates = dto.ids.map((id, index) =>
      this.prisma.pipelineEtapa.updateMany({
        where: { id, tenantId },
        data: { ordem: index + 1 },
      }),
    )
    await this.prisma.$transaction(updates)
    return this.listar(tenantId)
  }

  // ── Remover etapa (soft delete) ──────────────────────────────────────────
  async remover(tenantId: string, id: string) {
    const etapa = await this.prisma.pipelineEtapa.findFirst({ where: { id, tenantId } })
    if (!etapa) throw new NotFoundException('Etapa não encontrada')

    // Impede remover se houver matches nesta etapa
    const temMatches = await this.prisma.match.count({ where: { etapaId: id } })
    if (temMatches > 0) {
      throw new BadRequestException(
        `Não é possível remover: ${temMatches} match(es) estão nesta etapa. Mova-os primeiro.`,
      )
    }

    return this.prisma.pipelineEtapa.update({
      where: { id },
      data: { ativo: false },
    })
  }

  // ── Buscar primeira etapa do tenant (para novos matches) ─────────────────
  async primeiraEtapa(tenantId: string) {
    const etapa = await this.prisma.pipelineEtapa.findFirst({
      where: { tenantId, ativo: true },
      orderBy: { ordem: 'asc' },
    })
    if (!etapa) throw new BadRequestException('Tenant sem etapas de pipeline configuradas')
    return etapa
  }

  // ── Seed: cria etapas padrão para um tenant novo ─────────────────────────
  async criarEtapasPadrao(tenantId: string) {
    const existentes = await this.prisma.pipelineEtapa.count({ where: { tenantId } })
    if (existentes > 0) return // já tem etapas

    await this.prisma.pipelineEtapa.createMany({
      data: ETAPAS_PADRAO.map((e) => ({ ...e, tenantId })),
    })
  }
}
