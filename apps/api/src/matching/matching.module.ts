import { Module } from '@nestjs/common'
import { MatchingService } from './matching.service'
import { MatchingController } from './matching.controller'
import { ScoringService } from './scoring.service'
import { CompatibilidadeService } from './compatibilidade.service'
import { RelatorioService } from './relatorio.service'
import { NotificacoesModule } from '../notificacoes/notificacoes.module'
import { PipelineModule } from '../pipeline/pipeline.module'

@Module({
  imports:     [NotificacoesModule, PipelineModule],
  controllers: [MatchingController],
  providers:   [MatchingService, ScoringService, CompatibilidadeService, RelatorioService],
  exports:     [MatchingService],
})
export class MatchingModule {}
