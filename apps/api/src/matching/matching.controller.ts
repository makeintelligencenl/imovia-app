import { Controller, Get, Patch, Param, Query, Body, UseGuards, Request } from '@nestjs/common'
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger'
import { MatchingService } from './matching.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'

@ApiTags('matching')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('matches')
export class MatchingController {
  constructor(private readonly matchingService: MatchingService) {}

  @Get()
  findAll(
    @Request() req: any,
    @Query('imovelId') imovelId?: string,
    @Query('perfilId') perfilId?: string,
  ) {
    return this.matchingService.listarMatches(req.user.tenantId, { imovelId, perfilId })
  }

  @Patch(':id/status')
  updateStatus(
    @Request() req: any,
    @Param('id') id: string,
    @Body('status') status: string,
  ) {
    return this.matchingService.atualizarStatusMatch(req.user.tenantId, id, status)
  }
}
