import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards, Request } from '@nestjs/common'
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger'
import { ImoveisService } from './imoveis.service'
import { CreateImovelDto } from './dto/create-imovel.dto'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'

@ApiTags('imoveis')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('imoveis')
export class ImoveisController {
  constructor(private readonly imoveisService: ImoveisService) {}

  @Post()
  create(@Request() req: any, @Body() dto: CreateImovelDto) {
    return this.imoveisService.create(req.user.tenantId, dto)
  }

  @Get()
  findAll(
    @Request() req: any,
    @Query('tipoId') tipoId?: string,
    @Query('finalidade') finalidade?: string,
    @Query('status') status?: string,
  ) {
    return this.imoveisService.findAll(req.user.tenantId, { tipoId, finalidade, status })
  }

  @Get(':id')
  findOne(@Request() req: any, @Param('id') id: string) {
    return this.imoveisService.findById(req.user.tenantId, id)
  }

  @Patch(':id')
  update(@Request() req: any, @Param('id') id: string, @Body() dto: Partial<CreateImovelDto>) {
    return this.imoveisService.update(req.user.tenantId, id, dto)
  }

  @Delete(':id')
  remove(@Request() req: any, @Param('id') id: string) {
    return this.imoveisService.remove(req.user.tenantId, id)
  }

  @Patch(':id/status')
  updateStatus(@Request() req: any, @Param('id') id: string, @Body('status') status: string) {
    return this.imoveisService.updateStatus(req.user.tenantId, id, status)
  }
}
