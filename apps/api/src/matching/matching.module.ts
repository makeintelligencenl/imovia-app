import { Module } from '@nestjs/common'
import { MatchingService } from './matching.service'
import { MatchingController } from './matching.controller'
import { NotificacoesModule } from '../notificacoes/notificacoes.module'
import { PipelineModule } from '../pipeline/pipeline.module'
import { FinanceiroModule } from '../financeiro/financeiro.module'

@Module({
  imports: [NotificacoesModule, PipelineModule, FinanceiroModule],
  controllers: [MatchingController],
  providers: [MatchingService],
  exports: [MatchingService],
})
export class MatchingModule {}
