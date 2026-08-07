import { Module } from '@nestjs/common'
import { ClsModule } from 'nestjs-cls'
import { PrismaModule } from '../prisma/prisma.module'
import { CommonModule } from '../common/common.module'
import { NotificacoesModule } from '../notificacoes/notificacoes.module'
import { PipelineModule } from '../pipeline/pipeline.module'
import { CaracteristicasModule } from '../caracteristicas/caracteristicas.module'
import { DemoRequestsController } from './demo-requests.controller'
import { DemoRequestsService } from './demo-requests.service'

@Module({
  imports: [ClsModule, PrismaModule, CommonModule, NotificacoesModule, PipelineModule, CaracteristicasModule],
  controllers: [DemoRequestsController],
  providers: [DemoRequestsService],
})
export class DemoRequestsModule {}
