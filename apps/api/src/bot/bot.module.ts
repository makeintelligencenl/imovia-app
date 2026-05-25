import { Module } from '@nestjs/common'
import { BotController } from './bot.controller'
import { PerfisModule } from '../perfis/perfis.module'
import { MatchingModule } from '../matching/matching.module'
import { TiposModule } from '../tipos/tipos.module'
import { TenantsModule } from '../tenants/tenants.module'

@Module({
  imports: [PerfisModule, MatchingModule, TiposModule, TenantsModule],
  controllers: [BotController],
})
export class BotModule {}
