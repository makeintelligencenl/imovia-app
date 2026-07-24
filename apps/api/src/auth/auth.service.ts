import { Injectable, UnauthorizedException, ForbiddenException, BadRequestException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { PrismaService } from '../prisma/prisma.service'
import * as bcrypt from 'bcryptjs'
import { LoginDto } from './dto/login.dto'
import { RegisterDto } from './dto/register.dto'

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
  ) {}

  async register(
    dto: RegisterDto,
    requester: { id: string; role: string; tenantId: string },
  ) {
    if (requester.role !== 'ADMIN') {
      throw new ForbiddenException('Apenas administradores podem cadastrar usuários')
    }
    if (requester.tenantId !== dto.tenantId) {
      throw new ForbiddenException('Não é permitido criar usuários em outro tenant')
    }
    if (dto.role === 'ADMIN' && requester.role !== 'ADMIN') {
      throw new ForbiddenException('Apenas administradores podem criar outros administradores')
    }

    const passwordHash = await bcrypt.hash(dto.password, 12)
    const user = await this.prisma.user.create({
      data: { name: dto.name, email: dto.email, passwordHash, tenantId: dto.tenantId, role: dto.role || 'CORRETOR' },
      select: { id: true, name: true, email: true, role: true, tenantId: true },
    })
    return { user }
  }

  private async verifyTurnstile(token: string): Promise<void> {
    const secret = process.env.TURNSTILE_SECRET_KEY
    if (!secret) return // sem chave configurada, pula verificação (dev)

    const body = new URLSearchParams({ secret, response: token })
    const res  = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method:  'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body:    body.toString(),
    })
    const json = await res.json() as { success: boolean }
    if (!json.success) throw new BadRequestException('Verificação de segurança falhou')
  }

  async login(dto: LoginDto) {
    await this.verifyTurnstile(dto.cfTurnstileToken)
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
