import { Controller, Get, Post, Patch, Delete, Param, Body, Query, Request, UseGuards } from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import { VisitasService } from './visitas.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
// BUG #2 FIX: DTOs tipados substituem `any` — ValidationPipe global agora valida
// campos obrigatórios (imovelId, clienteId, dataHora) e rejeita campos extras
import { CreateVisitaDto } from './dto/create-visita.dto'
import { UpdateVisitaDto } from './dto/update-visita.dto'

@ApiTags('visitas')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('visitas')
export class VisitasController {
  constructor(private readonly visitasService: VisitasService) {}

  @Post()
  @ApiOperation({ summary: 'Cria uma nova visita' })
  criar(@Request() req: any, @Body() dto: CreateVisitaDto) {
    return this.visitasService.criar(req.user.tenantId, req.user.id, req.user.role, dto)
  }

  @Get()
  @ApiOperation({ summary: 'Lista visitas. Filtros: mes=YYYY-MM, corretorId' })
  listar(
    @Request() req: any,
    @Query('mes') mes?: string,
    @Query('corretorId') corretorId?: string,
  ) {
    return this.visitasService.listar(req.user.tenantId, req.user.id, req.user.role, mes, corretorId)
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalhe de uma visita' })
  buscarPorId(@Request() req: any, @Param('id') id: string) {
    return this.visitasService.buscarPorId(req.user.tenantId, id)
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualiza uma visita' })
  atualizar(@Request() req: any, @Param('id') id: string, @Body() dto: UpdateVisitaDto) {
    return this.visitasService.atualizar(req.user.tenantId, id, dto)
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remove uma visita' })
  remover(@Request() req: any, @Param('id') id: string) {
    return this.visitasService.remover(req.user.tenantId, id)
  }
}
