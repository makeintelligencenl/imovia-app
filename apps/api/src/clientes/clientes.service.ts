import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { CreateClienteDto } from './dto/create-cliente.dto'

const CORRETOR_SELECT = { select: { id: true, name: true, email: true } } as const

const INCLUDE_DEFAULT = {
  _count:   { select: { perfis: true } },
  corretor: CORRETOR_SELECT,
} as const

// Inclui dados necessários para pontuação automática do lead
const INCLUDE_FULL = {
  ...INCLUDE_DEFAULT,
  perfis: {
    where:   { ativo: true },
    select: {
      id:         true,
      finalidade: true,
      cidades:    true,
      bairros:    true,
      quartosMin: true,
      tipos:      { select: { id: true } },
      matches: {
        select:  { etapa: { select: { ordem: true } } },
        orderBy: { etapa: { ordem: 'desc' as const } },
        take:    1,
      },
    },
    orderBy: { createdAt: 'desc' as const },
  },
} as const

// ── Lead Score: pontuação automática por completude e engajamento (50–100) ──
//
// Base:                                               50 pts
// Contato   — WhatsApp (+10) · Telefone (+5)      até 15 pts
// Perfil    — Bairros (+8) · Quartos (+4)
//             Multi-tipos (+4) · Observações (+4)  até 20 pts
// Engajamento — progress no pipeline               até 15 pts
// ─────────────────────────────────────────────────────── total 100 pts
export function computeLeadScore(
  cliente: {
    whatsapp?:    string | null
    telefone?:    string | null
    observacoes?: string | null
    perfis: {
      bairros:    string[]
      quartosMin: number | null | undefined
      tipos:      unknown[]
      matches:    { etapa: { ordem: number } }[]
    }[]
  },
  totalEtapas: number,
): number {
  let score = 50

  // Contato (até +15)
  if (cliente.whatsapp) score += 10
  if (cliente.telefone) score += 5

  // Qualidade do perfil (até +20)
  if (cliente.observacoes)                                  score += 4
  if (cliente.perfis.some(p => p.bairros.length > 0))      score += 8
  if (cliente.perfis.some(p => p.quartosMin != null))       score += 4
  if (cliente.perfis.some(p => p.tipos.length >= 2))        score += 4

  // Engajamento — melhor etapa atravessada (até +15)
  const ordens = cliente.perfis.flatMap(p => p.matches.map(m => m.etapa.ordem))
  const best   = ordens.length ? Math.max(...ordens) : 0
  if (best > 0 && totalEtapas > 0) {
    score += Math.round((best / totalEtapas) * 15)
  }

  return Math.min(100, score)
}

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

    const [clientes, totalEtapas] = await Promise.all([
      this.prisma.cliente.findMany({
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
      }),
      this.prisma.pipelineEtapa.count({ where: { tenantId, ativo: true } }),
    ])

    return clientes.map(c => ({
      ...c,
      leadScore: computeLeadScore(c, totalEtapas),
    }))
  }

  async findById(tenantId: string, id: string) {
    const [c, totalEtapas] = await Promise.all([
      this.prisma.cliente.findFirst({
        where: { id, tenantId },
        include: {
          ...INCLUDE_DEFAULT,
          perfis: {
            include: {
              tipos:   true,
              _count:  { select: { matches: true } },
              matches: {
                select:  { etapa: { select: { ordem: true } } },
                orderBy: { etapa: { ordem: 'desc' as const } },
                take:    1,
              },
            },
            orderBy: { createdAt: 'desc' },
          },
        },
      }),
      this.prisma.pipelineEtapa.count({ where: { tenantId, ativo: true } }),
    ])
    if (!c) throw new NotFoundException('Cliente não encontrado')
    return { ...c, leadScore: computeLeadScore(c, totalEtapas) }
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
