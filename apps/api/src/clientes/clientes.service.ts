import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { CreateClienteDto } from './dto/create-cliente.dto'

const PERFIL_COUNT = { _count: { select: { perfis: true } } } as const

@Injectable()
export class ClientesService {
  constructor(private prisma: PrismaService) {}

  async create(tenantId: string, dto: CreateClienteDto) {
    return this.prisma.cliente.create({
      data: { ...dto, tenantId },
      include: PERFIL_COUNT,
    })
  }

  async findAll(tenantId: string, search?: string) {
    return this.prisma.cliente.findMany({
      where: {
        tenantId,
        ativo: true,
        ...(search
          ? {
              OR: [
                { nome:     { contains: search, mode: 'insensitive' } },
                { email:    { contains: search, mode: 'insensitive' } },
                { whatsapp: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      include: {
        ...PERFIL_COUNT,
        perfis: {
          where: { ativo: true },
          select: { id: true, finalidade: true, cidades: true },
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { nome: 'asc' },
    })
  }

  async findById(tenantId: string, id: string) {
    const c = await this.prisma.cliente.findFirst({
      where: { id, tenantId },
      include: {
        ...PERFIL_COUNT,
        perfis: {
          include: { tipos: true },
          orderBy: { createdAt: 'desc' },
        },
      },
    })
    if (!c) throw new NotFoundException('Cliente não encontrado')
    return c
  }

  async update(tenantId: string, id: string, dto: Partial<CreateClienteDto>) {
    await this.findById(tenantId, id)
    return this.prisma.cliente.update({
      where: { id },
      data: dto,
      include: PERFIL_COUNT,
    })
  }

  async remove(tenantId: string, id: string) {
    await this.findById(tenantId, id)
    // Soft delete — mantém histórico de matches
    return this.prisma.cliente.update({ where: { id }, data: { ativo: false } })
  }
}
