import { Injectable, UnauthorizedException } from '@nestjs/common'
import { PassportStrategy } from '@nestjs/passport'
import { ExtractJwt, Strategy } from 'passport-jwt'
import { Request } from 'express'
import { ConfigService } from '@nestjs/config'
import { PrismaService } from '../../prisma/prisma.service'

// S1 FIX: extrai JWT do cookie HttpOnly (frontend web) com fallback para
// Bearer header (MCP, integrações externas, Swagger). A ordem importa:
// o cookie tem prioridade por ser mais seguro.
function extractJwt(req: Request): string | null {
  const fromCookie = req?.cookies?.['auth_token']
  if (fromCookie) return fromCookie
  // Fallback: Authorization: Bearer <token>
  const authHeader = req?.headers?.authorization
  if (authHeader?.startsWith('Bearer ')) return authHeader.substring(7)
  return null
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: extractJwt,
      secretOrKey:    config.get('JWT_SECRET'),
      passReqToCallback: true, // necessário para que extractJwt receba o Request
    })
  }

  async validate(_req: Request, payload: { sub: string; tenantId: string }) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, role: true, tenantId: true, ativo: true },
    })
    if (!user || !user.ativo) throw new UnauthorizedException()
    return { id: user.id, email: user.email, role: user.role, tenantId: user.tenantId }
  }
}
