import { Module } from '@nestjs/common'
import { VisitasController } from './visitas.controller'
import { VisitasService } from './visitas.service'
import { PrismaModule } from '../prisma/prisma.module'

@Module({
  imports: [PrismaModule],
  controllers: [VisitasController],
  providers: [VisitasService],
  exports: [VisitasService],
})
export class VisitasModule {}
