import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, Request } from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { RolesGuard, Roles } from '../auth/guards/roles.guard'
import { PipelineService } from './pipeline.service'
import { CreateEtapaDto, UpdateEtapaDto, ReorderEtapasDto } from './dto/pipeline.dto'

@ApiTags('pipeline')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('pipeline')
export class PipelineController {
  constructor(private readonly pipelineService: PipelineService) {}

  // Leitura: todos os roles autenticados podem ver as etapas do seu tenant
  @Get('etapas')
  @ApiOperation({ summary: 'Lista as etapas do pipeline do tenant' })
  listar(@Request() req: any) {
    return this.pipelineService.listar(req.user.tenantId)
  }

  // BUG #1 FIX: mutações do pipeline restritas a ADMIN
  // Antes: qualquer usuário autenticado (incluindo CORRETOR) podia criar/editar/excluir etapas
  @Post('etapas')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Cria uma nova etapa no pipeline (ADMIN)' })
  criar(@Request() req: any, @Body() dto: CreateEtapaDto) {
    return this.pipelineService.criar(req.user.tenantId, dto)
  }

  @Patch('etapas/reorder')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Reordena as etapas do pipeline (ADMIN)' })
  reordenar(@Request() req: any, @Body() dto: ReorderEtapasDto) {
    return this.pipelineService.reordenar(req.user.tenantId, dto)
  }

  @Patch('etapas/:id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Atualiza nome, cor ou ordem de uma etapa (ADMIN)' })
  atualizar(@Request() req: any, @Param('id') id: string, @Body() dto: UpdateEtapaDto) {
    return this.pipelineService.atualizar(req.user.tenantId, id, dto)
  }

  @Delete('etapas/:id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Remove uma etapa (soft delete, somente se sem matches) (ADMIN)' })
  remover(@Request() req: any, @Param('id') id: string) {
    return this.pipelineService.remover(req.user.tenantId, id)
  }
}
