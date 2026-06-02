import { Controller, Get, Patch, Param, Query, Body, UseGuards, Request } from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import { MatchingService } from './matching.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { RolesGuard, Roles } from '../auth/guards/roles.guard'

@ApiTags('matching')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('matches')
export class MatchingController {
  constructor(private readonly matchingService: MatchingService) {}

  // Deve vir antes de :id para não ser capturado como parâmetro
  @Get('dashboard-summary')
  @ApiOperation({ summary: 'Resumo otimizado para o dashboard do corretor (KPIs + top matches)' })
  dashboardSummary(@Request() req: any) {
    return this.matchingService.dashboardSummary(req.user.tenantId, req.user.id, req.user.role)
  }

  @Get()
  @ApiOperation({ summary: 'Lista matches. CORRETOR vê apenas os seus' })
  findAll(
    @Request() req: any,
    @Query('imovelId')    imovelId?:    string,
    @Query('perfilId')    perfilId?:    string,
    @Query('clienteId')   clienteId?:   string,
    @Query('createdAfter') createdAfter?: string,
  ) {
    return this.matchingService.listarMatches(
      req.user.tenantId,
      req.user.id,
      req.user.role,
      { imovelId, perfilId, clienteId, createdAfter },
    )
  }

  @Patch(':id/etapa')
  @ApiOperation({ summary: 'Move o match para outra etapa do pipeline' })
  moverEtapa(
    @Request() req: any,
    @Param('id') id: string,
    @Body('etapaId') etapaId: string,
  ) {
    return this.matchingService.moverEtapa(req.user.tenantId, id, etapaId, req.user.id)
  }

  @Patch(':id/corretor')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Associa ou remove corretor de um match (ADMIN only)' })
  associarCorretor(
    @Request() req: any,
    @Param('id') id: string,
    @Body('corretorId') corretorId: string | null,
  ) {
    return this.matchingService.associarCorretor(req.user.tenantId, id, corretorId ?? null)
  }

  @Get(':id/historico')
  @ApiOperation({ summary: 'Retorna o histórico de movimentação de um match' })
  historico(
    @Request() req: any,
    @Param('id') id: string,
  ) {
    return this.matchingService.listarHistorico(req.user.tenantId, id)
  }
}
