import { Module } from '@nestjs/common'
import { MatchingService } from './matching.service'
import { MatchingController } from './matching.controller'
import { NotificacoesModule } from '../notificacoes/notificacoes.module'

@Module({
  imports: [NotificacoesModule],
  controllers: [MatchingController],
  providers: [MatchingService],
  exports: [MatchingService],
})
export class MatchingModule {}
