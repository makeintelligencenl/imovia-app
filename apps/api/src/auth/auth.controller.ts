import { Controller, Post, Body, UseGuards, Request } from '@nestjs/common'
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger'
import { AuthService } from './auth.service'
import { LoginDto } from './dto/login.dto'
import { RegisterDto } from './dto/register.dto'
import { JwtAuthGuard } from './guards/jwt-auth.guard'
import { ThrottlerGuard } from '@nestjs/throttler'

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

  @UseGuards(ThrottlerGuard)
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto)
  }
}
