import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { CreateClienteDto } from './dto/create-cliente.dto'

const CORRETOR_SELECT = { select: { id: true, name: true, email: true } } as const

const INCLUDE_DEFAULT = {
  _count:   { select: { perfis: true } },
  corretor: CORRETOR_SELECT,
} as const

const INCLUDE_FULL = {
  ...INCLUDE_DEFAULT,
  perfis: {
    where:   { ativo: true },
    select:  { id: true, finalidade: true, cidades: true },
    orderBy: { createdAt: 'desc' as const },
  },
} as const

@Injectable()
export class ClientesService {
  constructor(private prisma: PrismaService) {}

  async create(tenantId: string, dto: CreateClienteDto) {
    return this.prisma.cliente.create({
      data:    { ...dto, tenantId },
      include: INCLUDE_DEFAULT,
    })
  }

  async findAll(
    tenantId: string,
    userId: string,
    role: string,
    search?: string,
  ) {
    const corretorFilter =
      role === 'CORRETOR'
        ? { OR: [{ corretorId: userId }, { corretorId: null }] }
        : {}

    return this.prisma.cliente.findMany({
      where: {
        tenantId,
        ativo: true,
        ...corretorFilter,
        ...(search
          ? {
              OR: [
                { nome:     { contains: search, mode: 'insensitive' as const } },
                { email:    { contains: search, mode: 'insensitive' as const } },
                { whatsapp: { contains: search, mode: 'insensitive' as const } },
              ],
            }
          : {}),
      },
      include:  INCLUDE_FULL,
      orderBy: { nome: 'asc' },
    })
  }

  async findById(tenantId: string, id: string) {
    // BUG #3 FIX: adiciona `ativo: true` para impedir que clientes desativados
    // (soft-deleted) sejam acessados por ID direto — consistente com findAll
    const c = await this.prisma.cliente.findFirst({
      where: { id, tenantId, ativo: true },
      include: {
        ...INCLUDE_DEFAULT,
        perfis: {
          // BUG #3: sem where:{ ativo: true }, perfis desativados apareciam
          // na tela de detalhe do cliente, inflando o contador de matches.
          where:    { ativo: true },
          include:  { tipos: true, _count: { select: { matches: true } } },
          orderBy:  { createdAt: 'desc' },
        },
      },
    })
    if (!c) throw new NotFoundException('Cliente não encontrado')
    return c
  }

  async update(tenantId: string, id: string, dto: Partial<CreateClienteDto>) {
    await this.findById(tenantId, id)
    return this.prisma.cliente.update({
      where:   { id },
      data:    dto,
      include: INCLUDE_DEFAULT,
    })
  }

  async remove(tenantId: string, id: string) {
    await this.findById(tenantId, id)
    // Soft delete — mantém histórico de matches
    return this.prisma.cliente.update({ where: { id }, data: { ativo: false } })
  }
}
