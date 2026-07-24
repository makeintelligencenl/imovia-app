import { Module } from '@nestjs/common'
import { PrismaModule } from '../prisma/prisma.module'
import { CommonModule } from '../common/common.module'
import { NotificacoesModule } from '../notificacoes/notificacoes.module'
import { DemoRequestsController } from './demo-requests.controller'
import { DemoRequestsService } from './demo-requests.service'

@Module({
  imports: [PrismaModule, CommonModule, NotificacoesModule],
  controllers: [DemoRequestsController],
  providers: [DemoRequestsService],
})
export class DemoRequestsModule {}
