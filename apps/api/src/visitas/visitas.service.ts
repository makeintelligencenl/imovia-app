import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'

const IMOVEL_SELECT   = { id: true, titulo: true, bairro: true, cidade: { select: { nome: true } } } as const
const CORRETOR_SELECT = { id: true, name: true, email: true } as const
const CLIENTE_SELECT  = { id: true, nome: true, email: true, whatsapp: true, telefone: true } as const

@Injectable()
export class VisitasService {
  constructor(private prisma: PrismaService) {}

  async criar(tenantId: string, userId: string, userRole: string, dto: any) {
    const corretorId = userRole === 'CORRETOR' ? userId : (dto.corretorId ?? null)

    return this.prisma.visita.create({
      data: {
        tenantId,
        imovelId:   dto.imovelId,
        clienteId:  dto.clienteId,
        matchId:    dto.matchId    ?? null,
        corretorId,
        dataHora:   new Date(dto.dataHora),
        duracaoMin: dto.duracaoMin ?? 60,
        status:     dto.status     ?? 'AGENDADA',
        observacoes: dto.observacoes ?? null,
      },
      include: {
        imovel:   { select: IMOVEL_SELECT },
        cliente:  { select: CLIENTE_SELECT },
        corretor: { select: CORRETOR_SELECT },
      },
    })
  }

  async listar(
    tenantId: string,
    userId: string,
    userRole: string,
    mes?: string,
    filtroCorretorId?: string,
  ) {
    const where: any = { tenantId }

    if (userRole === 'CORRETOR') {
      where.corretorId = userId
    } else if (filtroCorretorId && filtroCorretorId !== '__todos__') {
      where.corretorId = filtroCorretorId
    }

    if (mes) {
      const [year, month] = mes.split('-').map(Number)
      where.dataHora = {
        gte: new Date(Date.UTC(year, month - 1, 1)),
        lt:  new Date(Date.UTC(year, month,     1)),
      }
    }

    return this.prisma.visita.findMany({
      where,
      include: {
        imovel:   { select: IMOVEL_SELECT },
        cliente:  { select: CLIENTE_SELECT },
        corretor: { select: CORRETOR_SELECT },
      },
      orderBy: { dataHora: 'asc' },
    })
  }

  async buscarPorId(tenantId: string, id: string) {
    const visita = await this.prisma.visita.findFirst({
      where: { id, tenantId },
      include: {
        imovel:   { select: IMOVEL_SELECT },
        cliente:  { select: CLIENTE_SELECT },
        corretor: { select: CORRETOR_SELECT },
      },
    })
    if (!visita) throw new NotFoundException('Visita nao encontrada')
    return visita
  }

  async atualizar(tenantId: string, id: string, dto: any) {
    const visita = await this.prisma.visita.findFirst({ where: { id, tenantId } })
    if (!visita) throw new NotFoundException('Visita nao encontrada')

    const data: any = {}
    if (dto.imovelId   !== undefined) data.imovelId   = dto.imovelId
    if (dto.clienteId  !== undefined) data.clienteId  = dto.clienteId
    if (dto.corretorId !== undefined) data.corretorId = dto.corretorId ?? null
    if (dto.dataHora   !== undefined) data.dataHora   = new Date(dto.dataHora)
    if (dto.duracaoMin !== undefined) data.duracaoMin = dto.duracaoMin
    if (dto.status     !== undefined) data.status     = dto.status
    if (dto.observacoes !== undefined) data.observacoes = dto.observacoes ?? null

    return this.prisma.visita.update({
      where: { id },
      data,
      include: {
        imovel:   { select: IMOVEL_SELECT },
        cliente:  { select: CLIENTE_SELECT },
        corretor: { select: CORRETOR_SELECT },
      },
    })
  }

  async remover(tenantId: string, id: string) {
    const visita = await this.prisma.visita.findFirst({ where: { id, tenantId } })
    if (!visita) throw new NotFoundException('Visita nao encontrada')
    await this.prisma.visita.delete({ where: { id } })
    return { success: true }
  }
}
