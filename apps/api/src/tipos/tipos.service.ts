import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class TiposService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.tipoImovel.findMany({
      where: { ativo: true },
      orderBy: { nome: 'asc' },
    })
  }

  async findByNome(nome: string) {
    return this.prisma.tipoImovel.findFirst({
      where: { nome: { equals: nome, mode: 'insensitive' }, ativo: true },
    })
  }
}
