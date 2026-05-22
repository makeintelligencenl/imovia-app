import { Module } from '@nestjs/common'
import { TiposService } from './tipos.service'
import { TiposController } from './tipos.controller'

@Module({
  controllers: [TiposController],
  providers: [TiposService],
  exports: [TiposService],
})
export class TiposModule {}
