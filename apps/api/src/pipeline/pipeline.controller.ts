import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, Request } from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { PipelineService } from './pipeline.service'
import { CreateEtapaDto, UpdateEtapaDto, ReorderEtapasDto } from './dto/pipeline.dto'

@ApiTags('pipeline')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('pipeline')
export class PipelineController {
  constructor(private readonly pipelineService: PipelineService) {}

  @Get('etapas')
  @ApiOperation({ summary: 'Lista as etapas do pipeline do tenant' })
  listar(@Request() req: any) {
    return this.pipelineService.listar(req.user.tenantId)
  }

  @Post('etapas')
  @ApiOperation({ summary: 'Cria uma nova etapa no pipeline' })
  criar(@Request() req: any, @Body() dto: CreateEtapaDto) {
    return this.pipelineService.criar(req.user.tenantId, dto)
  }

  @Patch('etapas/reorder')
  @ApiOperation({ summary: 'Reordena as etapas do pipeline' })
  reordenar(@Request() req: any, @Body() dto: ReorderEtapasDto) {
    return this.pipelineService.reordenar(req.user.tenantId, dto)
  }

  @Patch('etapas/:id')
  @ApiOperation({ summary: 'Atualiza nome, cor ou ordem de uma etapa' })
  atualizar(@Request() req: any, @Param('id') id: string, @Body() dto: UpdateEtapaDto) {
    return this.pipelineService.atualizar(req.user.tenantId, id, dto)
  }

  @Delete('etapas/:id')
  @ApiOperation({ summary: 'Remove uma etapa (soft delete, somente se sem matches)' })
  remover(@Request() req: any, @Param('id') id: string) {
    return this.pipelineService.remover(req.user.tenantId, id)
  }
}
