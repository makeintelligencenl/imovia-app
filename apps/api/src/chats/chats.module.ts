import { Module } from '@nestjs/common'
import { ChatsService } from './chats.service'
import { ChatsController } from './chats.controller'
import { WebhookController } from './webhook.controller'
import { PrismaModule } from '../prisma/prisma.module'

@Module({
  imports:     [PrismaModule],
  controllers: [ChatsController, WebhookController],
  providers:   [ChatsService],
})
export class ChatsModule {}
