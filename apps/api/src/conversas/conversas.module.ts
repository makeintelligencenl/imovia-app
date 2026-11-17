import { Module } from '@nestjs/common'
import { PrismaModule } from '../prisma/prisma.module'
import { StorageModule } from '../storage/storage.module'
import { WhatsappModule } from '../whatsapp/whatsapp.module'
import { ConversasController } from './conversas.controller'
import { ConversasService } from './conversas.service'

@Module({
  imports: [PrismaModule, WhatsappModule, StorageModule],
  controllers: [ConversasController],
  providers: [ConversasService],
})
export class ConversasModule {}
