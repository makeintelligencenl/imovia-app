import { Module } from '@nestjs/common'
import { PrismaModule } from '../prisma/prisma.module'
import { WhatsappModule } from '../whatsapp/whatsapp.module'
import { ConversasController } from './conversas.controller'
import { ConversasService } from './conversas.service'

@Module({
  imports: [PrismaModule, WhatsappModule],
  controllers: [ConversasController],
  providers: [ConversasService],
})
export class ConversasModule {}
