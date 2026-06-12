import { Module } from '@nestjs/common'
import { MatchingService } from './matching.service'
import { MatchingController } from './matching.controller'
import { NotificacoesModule } from '../notificacoes/notificacoes.module'
import { PipelineModule } from '../pipeline/pipeline.module'

@Module({
  imports: [NotificacoesModule, PipelineModule],
  controllers: [MatchingController],
  providers: [MatchingService],
  exports: [MatchingService],
})
export class MatchingModule {}
