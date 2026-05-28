import { Module } from '@nestjs/common'
import { TenantsService } from './tenants.service'
import { TenantsController } from './tenants.controller'
import { PipelineModule } from '../pipeline/pipeline.module'

@Module({
  imports: [PipelineModule],
  controllers: [TenantsController],
  providers: [TenantsService],
  exports: [TenantsService],
})
export class TenantsModule {}
