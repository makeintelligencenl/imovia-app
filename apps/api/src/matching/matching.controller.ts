import { Controller, Get, Patch, Param, Query, Body, UseGuards, Request } from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import { MatchingService } from './matching.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'

@ApiTags('matching')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('matches')
export class MatchingController {
  constructor(private readonly matchingService: MatchingService) {}

  @Get()
  @ApiOperation({ summary: 'Lista todos os matches do tenant com etapa do pipeline' })
  findAll(
    @Request() req: any,
    @Query('imovelId') imovelId?: string,
    @Query('perfilId') perfilId?: string,
  ) {
    return this.matchingService.listarMatches(req.user.tenantId, { imovelId, perfilId })
  }

  @Patch(':id/etapa')
  @ApiOperation({ summary: 'Move o match para outra etapa do pipeline' })
  moverEtapa(
    @Request() req: any,
    @Param('id') id: string,
    @Body('etapaId') etapaId: string,
  ) {
    return this.matchingService.moverEtapa(req.user.tenantId, id, etapaId)
  }
}
