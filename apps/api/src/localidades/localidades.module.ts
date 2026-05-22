import { Module } from '@nestjs/common'
import { LocalidadesController } from './localidades.controller'
import { PrismaModule } from '../prisma/prisma.module'

@Module({
  imports: [PrismaModule],
  controllers: [LocalidadesController],
})
export class LocalidadesModule {}
