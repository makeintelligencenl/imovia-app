import { Module } from '@nestjs/common'
import { ImoveisService } from './imoveis.service'
import { ImoveisController } from './imoveis.controller'
import { MatchingModule } from '../matching/matching.module'

@Module({
  imports: [MatchingModule],
  controllers: [ImoveisController],
  providers: [ImoveisService],
  exports: [ImoveisService],
})
export class ImoveisModule {}
