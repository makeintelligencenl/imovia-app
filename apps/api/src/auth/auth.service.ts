import { Injectable, UnauthorizedException, ForbiddenException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { PrismaService } from '../prisma/prisma.service'
import * as bcrypt from 'bcryptjs'
import { LoginDto } from './dto/login.dto'
import { RegisterDto } from './dto/register.dto'
import { TurnstileService } from '../common/turnstile.service'

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private turnstile: TurnstileService,
  ) {}

  async register(
    dto: RegisterDto,
    requester: { id: string; role: string; tenantId: string },
  ) {
    if (requester.role !== 'ADMIN' && requester.role !== 'SUPERADMIN') {
      throw new ForbiddenException('Apenas administradores podem cadastrar usuários')
    }
    if (requester.role !== 'SUPERADMIN' && requester.tenantId !== dto.tenantId) {
      throw new ForbiddenException('Não é permitido criar usuários em outro tenant')
    }

    const passwordHash = await bcrypt.hash(dto.password, 12)
    const user = await this.prisma.user.create({
      data: { name: dto.name, email: dto.email, passwordHash, tenantId: dto.tenantId, role: dto.role || 'CORRETOR' },
      select: { id: true, name: true, email: true, role: true, tenantId: true },
    })
    return { user }
  }

  async login(dto: LoginDto) {
    await this.turnstile.verify(dto.cfTurnstileToken)
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } })
    if (!user || !(await bcrypt.compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException('Credenciais inválidas')
    }
    if (!user.ativo) throw new UnauthorizedException('Usuário inativo')

    return {
      user: { id: user.id, name: user.name, email: user.email, role: user.role, tenantId: user.tenantId },
      token: this.jwt.sign({ sub: user.id, tenantId: user.tenantId }),
    }
  }
}
