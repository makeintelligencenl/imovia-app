import { Module } from '@nestjs/common'
import { ImoveisService } from './imoveis.service'
import { ImoveisController } from './imoveis.controller'
import { GeocodingService } from './geocoding.service'
import { MatchingModule } from '../matching/matching.module'

@Module({
  imports: [MatchingModule],
  controllers: [ImoveisController],
  providers: [ImoveisService, GeocodingService],
  exports: [ImoveisService],
})
export class ImoveisModule {}
