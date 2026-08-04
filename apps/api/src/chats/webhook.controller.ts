import { Controller, Post, Body, Request, Logger } from '@nestjs/common'
import { ApiTags, ApiOperation } from '@nestjs/swagger'

@ApiTags('chats-webhook')
@Controller('chats')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name)

  // Endpoint público — o GPT Maker não envia JWT
  @Post('webhook')
  @ApiOperation({ summary: '[DISCOVERY] Loga payload do webhook do GPT Maker' })
  webhook(@Body() body: unknown, @Request() req: any) {
    this.logger.log('[WEBHOOK DISCOVERY] Headers: ' + JSON.stringify(req.headers))
    this.logger.log('[WEBHOOK DISCOVERY] Body: ' + JSON.stringify(body))
    return { received: true }
  }
}
