import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { UpdateUserDto } from './dto/update-user.dto'
import * as bcrypt from 'bcryptjs'

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  // ── Listar usuários do tenant ─────────────────────────────────────────────
  async listar(tenantId: string) {
    return this.prisma.user.findMany({
      where: { tenantId },
      select: {
        id:        true,
        name:      true,
        email:     true,
        role:      true,
        ativo:     true,
        createdAt: true,
      },
      orderBy: [{ role: 'asc' }, { name: 'asc' }],
    })
  }

  // ── Atualizar dados do usuário ────────────────────────────────────────────
  async atualizar(tenantId: string, id: string, dto: UpdateUserDto) {
    const user = await this.prisma.user.findFirst({ where: { id, tenantId } })
    if (!user) throw new NotFoundException('Usuário não encontrado')

    const data: Record<string, unknown> = {}
    if (dto.name)     data.name         = dto.name
    if (dto.email)    data.email        = dto.email
    if (dto.password) data.passwordHash = await bcrypt.hash(dto.password, 12)

    return this.prisma.user.update({
      where: { id },
      data,
      select: { id: true, name: true, email: true, role: true, ativo: true },
    })
  }

  // ── Remover usuário ───────────────────────────────────────────────────────
  async remover(tenantId: string, id: string, requesterId: string) {
    if (id === requesterId) {
      throw new BadRequestException('Não é possível excluir sua própria conta')
    }

    const user = await this.prisma.user.findFirst({ where: { id, tenantId } })
    if (!user) throw new NotFoundException('Usuário não encontrado')

    // Desassocia matches antes de deletar
    await this.prisma.match.updateMany({
      where: { corretorId: id },
      data:  { corretorId: null },
    })

    return this.prisma.user.delete({
      where: { id },
      select: { id: true, name: true, email: true },
    })
  }
}
