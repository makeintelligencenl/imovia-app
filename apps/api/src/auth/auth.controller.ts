import { Controller, Post, Body, UseGuards, Request, Res, HttpCode } from '@nestjs/common'
import { Response } from 'express'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import { Throttle } from '@nestjs/throttler'
import { AuthService } from './auth.service'
import { LoginDto } from './dto/login.dto'
import { RegisterDto } from './dto/register.dto'
import { JwtAuthGuard } from './guards/jwt-auth.guard'

// Duração do cookie: alinhada com JWT_EXPIRES_IN (padrão 8h)
const COOKIE_MAX_AGE_MS = parseInt(process.env.COOKIE_MAX_AGE_MS ?? '') || 8 * 60 * 60 * 1000

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

  // S1 FIX: login seta JWT em HttpOnly cookie (inacessível ao JavaScript) em vez de
  // retornar o token no body. Cookies HttpOnly eliminam risco de XSS roubar o token.
  // O campo `token` ainda é retornado no body para compatibilidade com clientes de API
  // (MCP, integrações externas) que usam Bearer — o frontend web não o utiliza mais.
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.login(dto)

    res.cookie('auth_token', result.token, {
      httpOnly:  true,                                  // inacessível ao JS
      secure:    process.env.NODE_ENV === 'production', // HTTPS only em prod
      sameSite:  'none',                                // cross-origin (API ≠ Web no Railway)
      maxAge:    COOKIE_MAX_AGE_MS,
      path:      '/',
    })

    // Retorna user + token: user para o frontend salvar no sessionStorage (não-sensível),
    // token para clientes de API que ainda usam Bearer header
    return result
  }

  // S1 FIX: endpoint de logout limpa o cookie no browser
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(200)
  @Post('logout')
  @ApiOperation({ summary: 'Encerra a sessão e limpa o cookie de autenticação' })
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('auth_token', {
      httpOnly: true,
      secure:   process.env.NODE_ENV === 'production',
      sameSite: 'none',
      path:     '/',
    })
    return { message: 'Sessão encerrada' }
  }
}
