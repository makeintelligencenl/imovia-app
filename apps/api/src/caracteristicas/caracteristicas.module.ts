import { Module } from '@nestjs/common'
import { CaracteristicasService } from './caracteristicas.service'
import { CaracteristicasController } from './caracteristicas.controller'
import { PrismaModule } from '../prisma/prisma.module'

@Module({
  imports: [PrismaModule],
  controllers: [CaracteristicasController],
  providers: [CaracteristicasService],
  exports: [CaracteristicasService],
})
export class CaracteristicasModule {}
