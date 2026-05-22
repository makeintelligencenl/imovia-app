import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards, Request } from '@nestjs/common'
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger'
import { PerfisService } from './perfis.service'
import { CreatePerfilDto } from './dto/create-perfil.dto'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'

@ApiTags('perfis')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('perfis')
export class PerfisController {
  constructor(private readonly perfisService: PerfisService) {}

  @Post()
  create(@Request() req: any, @Body() dto: CreatePerfilDto) {
    return this.perfisService.create(req.user.tenantId, dto)
  }

  @Get()
  findAll(@Request() req: any) {
    return this.perfisService.findAll(req.user.tenantId)
  }

  @Get(':id')
  findOne(@Request() req: any, @Param('id') id: string) {
    return this.perfisService.findById(req.user.tenantId, id)
  }

  @Patch(':id')
  update(@Request() req: any, @Param('id') id: string, @Body() dto: Partial<CreatePerfilDto>) {
    return this.perfisService.update(req.user.tenantId, id, dto)
  }

  @Delete(':id')
  remove(@Request() req: any, @Param('id') id: string) {
    return this.perfisService.remove(req.user.tenantId, id)
  }
}
