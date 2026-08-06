import { Controller, Post, Body, UseGuards, Request, Res, HttpCode, Get } from '@nestjs/common'
import { Response } from 'express'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import { Throttle } from '@nestjs/throttler'
import { AuthService } from './auth.service'
import { LoginDto } from './dto/login.dto'
import { RegisterDto } from './dto/register.dto'
import { JwtAuthGuard } from './guards/jwt-auth.guard'

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

  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.login(dto)

    res.cookie('auth_token', result.token, {
      httpOnly:  true,
      secure:    process.env.NODE_ENV === 'production',
      sameSite:  'none',
      maxAge:    COOKIE_MAX_AGE_MS,
      path:      '/',
    })

    return { user: result.user, token: result.token }
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(200)
  @Post('change-password')
  @ApiOperation({ summary: 'Troca a senha do usuário autenticado e limpa forcePasswordChange' })
  changePassword(
    @Body('password') password: string,
    @Request() req: { user: { id: string } },
  ) {
    return this.authService.changePassword(req.user.id, password)
  }

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
