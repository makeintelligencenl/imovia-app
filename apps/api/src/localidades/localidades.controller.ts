import { Controller, Get, Query, UseGuards } from '@nestjs/common'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { PrismaService } from '../prisma/prisma.service'

@Controller('localidades')
@UseGuards(JwtAuthGuard)
export class LocalidadesController {
  constructor(private prisma: PrismaService) {}

  @Get('estados')
  async estados() {
    return this.prisma.estado.findMany({ orderBy: { nome: 'asc' } })
  }

  @Get('cidades')
  async cidades(@Query('estadoId') estadoId?: string, @Query('id') id?: string) {
    if (id) {
      return this.prisma.cidade.findUnique({
        where: { id: Number(id) },
        select: { id: true, nome: true, estadoId: true },
      })
    }
    return this.prisma.cidade.findMany({
      where: estadoId ? { estadoId: Number(estadoId) } : undefined,
      orderBy: { nome: 'asc' },
      select: { id: true, nome: true, estadoId: true },
    })
  }
}
