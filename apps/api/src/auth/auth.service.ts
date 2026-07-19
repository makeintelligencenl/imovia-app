import { Injectable, UnauthorizedException, ForbiddenException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { PrismaService } from '../prisma/prisma.service'
import * as bcrypt from 'bcryptjs'
import * as crypto from 'crypto'
import { LoginDto } from './dto/login.dto'
import { RegisterDto } from './dto/register.dto'

const ACCESS_TOKEN_TTL  = '15m'
const REFRESH_TOKEN_TTL = 7 * 24 * 60 * 60 * 1000 // 7 dias em ms

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}

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

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } })
    if (!user || !(await bcrypt.compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException('Credenciais inválidas')
    }
    if (!user.ativo) throw new UnauthorizedException('Usuário inativo')

    const publicUser = { id: user.id, name: user.name, email: user.email, role: user.role, tenantId: user.tenantId }
    const { accessToken, refreshToken } = await this.issueTokenPair(user.id, user.tenantId)

    return { user: publicUser, accessToken, refreshToken }
  }

  async refresh(rawRefreshToken: string) {
    const tokenHash = hashToken(rawRefreshToken)

    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: { select: { id: true, tenantId: true, ativo: true } } },
    })

    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      // Token inválido ou expirado — pode ser reuse attack; revogar todos do user
      if (stored) {
        await this.prisma.refreshToken.updateMany({
          where: { userId: stored.userId, revokedAt: null },
          data: { revokedAt: new Date() },
        })
      }
      throw new UnauthorizedException('Refresh token inválido')
    }

    if (!stored.user.ativo) throw new UnauthorizedException('Usuário inativo')

    // Revoga o token atual e emite novo par (rotação)
    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    })

    return this.issueTokenPair(stored.user.id, stored.user.tenantId)
  }

  async logout(rawRefreshToken: string | undefined) {
    if (!rawRefreshToken) return
    const tokenHash = hashToken(rawRefreshToken)
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    })
  }

  // Limpa tokens expirados/revogados — chamar periodicamente (cron ou on-login)
  async cleanupTokens() {
    await this.prisma.$executeRaw`SELECT cleanup_expired_refresh_tokens()`
  }

  private async issueTokenPair(userId: string, tenantId: string) {
    const accessToken  = this.jwt.sign({ sub: userId, tenantId }, { expiresIn: ACCESS_TOKEN_TTL })
    const refreshToken = crypto.randomBytes(40).toString('hex') // 80 chars, 320 bits de entropia

    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL)
    await this.prisma.refreshToken.create({
      data: { tokenHash: hashToken(refreshToken), userId, expiresAt },
    })

    // Aproveita o login para limpar tokens velhos desse user (sem bloquear)
    this.prisma.refreshToken.deleteMany({
      where: { userId, OR: [{ expiresAt: { lt: new Date() } }, { revokedAt: { not: null } }] },
    }).catch(() => {/* best-effort */})

    return { accessToken, refreshToken }
  }
}
