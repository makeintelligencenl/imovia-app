import { Module } from '@nestjs/common'
import { ChatsService } from './chats.service'
import { ChatsController } from './chats.controller'
import { WebhookController } from './webhook.controller'
import { ChatEventsService } from './chat-events.service'
import { PrismaModule } from '../prisma/prisma.module'

@Module({
  imports:     [PrismaModule],
  controllers: [ChatsController, WebhookController],
  providers:   [ChatsService, ChatEventsService],
})
export class ChatsModule {}
