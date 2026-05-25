import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest()
    const apiKey = request.headers['x-bot-api-key']
    const expectedKey = this.config.getOrThrow<string>('BOT_API_KEY')

    if (!apiKey || apiKey !== expectedKey) {
      throw new UnauthorizedException('API key inválida ou ausente')
    }

    return true
  }
}
