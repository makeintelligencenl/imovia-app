import { Module } from '@nestjs/common'
import { PerfisService } from './perfis.service'
import { PerfisController } from './perfis.controller'
import { MatchingModule } from '../matching/matching.module'

@Module({
  imports: [MatchingModule],
  controllers: [PerfisController],
  providers: [PerfisService],
  exports: [PerfisService],
})
export class PerfisModule {}
