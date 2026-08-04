import { Controller, Post, Get, Body, Param, Res, Logger } from '@nestjs/common'
import { ApiTags, ApiOperation } from '@nestjs/swagger'
import { Response } from 'express'
import { PrismaService } from '../prisma/prisma.service'
import { ChatEventsService } from './chat-events.service'

interface GptMakerWebhookPayload {
  assistantId: string
  contextId:   string
  role:        string
  message:     string
  date:        string
  contactName: string | null
  contactPhone: string | null
  messageId:   string
  channel:     string
}

@ApiTags('chats-webhook')
@Controller('chats')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly chatEvents: ChatEventsService,
  ) {}

  @Post('webhook')
  @ApiOperation({ summary: 'Webhook de nova mensagem do GPT Maker' })
  async webhook(@Body() body: GptMakerWebhookPayload) {
    const { assistantId, contextId, role, message, date, contactName, contactPhone, messageId } = body

    if (!assistantId || !contextId) return { received: true }

    const tenant = await this.prisma.tenant.findFirst({
      where: { gptMakerAgentId: assistantId },
      select: { id: true },
    })

    if (!tenant) {
      this.logger.warn(`Webhook recebido para assistantId desconhecido: ${assistantId}`)
      return { received: true }
    }

    this.chatEvents.emit(tenant.id, 'new-message', {
      chatId: contextId,
      role,
      message,
      date,
      contactName,
      contactPhone,
      messageId,
    })

    return { received: true }
  }

  @Get('events/:tenantId')
  @ApiOperation({ summary: 'SSE — stream de eventos de chat por tenant' })
  events(@Param('tenantId') tenantId: string, @Res() res: Response) {
    const cleanup = this.chatEvents.subscribe(tenantId, res)
    res.on('close', cleanup)
  }
}
