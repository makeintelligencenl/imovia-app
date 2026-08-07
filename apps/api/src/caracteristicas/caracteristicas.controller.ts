import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards, Request } from '@nestjs/common'
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { CaracteristicasService } from './caracteristicas.service'
import { CreateCaracteristicaDto } from './dto/create-caracteristica.dto'

@ApiTags('caracteristicas')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('caracteristicas')
export class CaracteristicasController {
  constructor(private readonly svc: CaracteristicasService) {}

  @Get()
  findAll(@Request() req: any) {
    return this.svc.findAll(req.user.tenantId)
  }

  @Post()
  create(@Request() req: any, @Body() dto: CreateCaracteristicaDto) {
    return this.svc.create(req.user.tenantId, dto)
  }

  @Patch(':id')
  update(@Request() req: any, @Param('id') id: string, @Body() dto: Partial<CreateCaracteristicaDto>) {
    return this.svc.update(req.user.tenantId, id, dto)
  }

  @Delete(':id')
  remove(@Request() req: any, @Param('id') id: string) {
    return this.svc.remove(req.user.tenantId, id)
  }
}
