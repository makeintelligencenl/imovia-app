import { Controller, Post, Body, UseGuards, Request, Res, Req, HttpCode, UnauthorizedException } from '@nestjs/common'
import { Response, Request as ExpressRequest } from 'express'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import { Throttle } from '@nestjs/throttler'
import { AuthService } from './auth.service'
import { LoginDto } from './dto/login.dto'
import { RegisterDto } from './dto/register.dto'
import { JwtAuthGuard } from './guards/jwt-auth.guard'

// access_token: vida curta (alinhada com JWT_EXPIRES_IN = 15m)
const ACCESS_COOKIE_AGE_MS  = 15 * 60 * 1000
// refresh_token: vida longa (7 dias)
const REFRESH_COOKIE_AGE_MS = 7 * 24 * 60 * 60 * 1000

const COOKIE_BASE = {
  httpOnly: true,
  secure:   process.env.NODE_ENV === 'production',
  sameSite: 'none' as const,
}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('register')
  register(
    @Body() dto: RegisterDto,
    @Request() req: { user: { id: string; role: string; tenantId: string } },
  ) {
    return this.authService.register(dto, req.user)
  }

  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { user, accessToken, refreshToken } = await this.authService.login(dto)

    // access_token: curto prazo — autenticação de cada request
    res.cookie('access_token', accessToken, {
      ...COOKIE_BASE,
      maxAge: ACCESS_COOKIE_AGE_MS,
      path:   '/',
    })

    // refresh_token: longo prazo, restrito ao endpoint de renovação
    res.cookie('refresh_token', refreshToken, {
      ...COOKIE_BASE,
      maxAge: REFRESH_COOKIE_AGE_MS,
      path:   '/api/v1/auth/refresh',
    })

    return { user }
  }

  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @HttpCode(200)
  @Post('refresh')
  @ApiOperation({ summary: 'Renova o access_token usando o refresh_token (rotação)' })
  async refresh(
    @Req() req: ExpressRequest,
    @Res({ passthrough: true }) res: Response,
  ) {
    const rawRefreshToken = req.cookies?.['refresh_token']
    if (!rawRefreshToken) throw new UnauthorizedException('Refresh token ausente')

    const { accessToken, refreshToken } = await this.authService.refresh(rawRefreshToken)

    res.cookie('access_token', accessToken, {
      ...COOKIE_BASE,
      maxAge: ACCESS_COOKIE_AGE_MS,
      path:   '/',
    })

    res.cookie('refresh_token', refreshToken, {
      ...COOKIE_BASE,
      maxAge: REFRESH_COOKIE_AGE_MS,
      path:   '/api/v1/auth/refresh',
    })

    return { ok: true }
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(200)
  @Post('logout')
  @ApiOperation({ summary: 'Encerra a sessão, revoga o refresh_token e limpa os cookies' })
  async logout(
    @Req() req: ExpressRequest,
    @Res({ passthrough: true }) res: Response,
  ) {
    const rawRefreshToken = req.cookies?.['refresh_token']
    await this.authService.logout(rawRefreshToken)

    res.clearCookie('access_token',  { ...COOKIE_BASE, path: '/' })
    res.clearCookie('refresh_token', { ...COOKIE_BASE, path: '/api/v1/auth/refresh' })

    return { message: 'Sessão encerrada' }
  }
}
