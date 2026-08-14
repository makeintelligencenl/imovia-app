import { Controller, Get, Post, Patch, Param, Query, Body, Request, UseGuards } from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import { AluguelService } from './aluguel.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { RolesGuard, Roles } from '../auth/guards/roles.guard'
import { FecharAluguelDto } from './dto/fechar-aluguel.dto'

@ApiTags('aluguel')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('aluguel')
export class AluguelController {
  constructor(private readonly aluguelService: AluguelService) {}

  @Get('dados-fechamento/:matchId')
  @ApiOperation({ summary: 'Dados pré-preenchidos para o modal de fechamento de aluguel' })
  dadosFechamento(@Request() req: any, @Param('matchId') matchId: string) {
    return this.aluguelService.dadosFechamento(req.user.tenantId, matchId)
  }

  @Post('fechar')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Fecha aluguel: cria contrato, move etapa, muda status do imóvel para ALUGADO' })
  fecharAluguel(@Request() req: any, @Body() dto: FecharAluguelDto) {
    return this.aluguelService.fecharAluguel(req.user.tenantId, req.user.id, dto)
  }

  @Get('contratos')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Lista contratos de aluguel' })
  listarContratos(
    @Request() req: any,
    @Query('status')     status?:     string,
    @Query('corretorId') corretorId?: string,
  ) {
    return this.aluguelService.listarContratos(req.user.tenantId, { status, corretorId })
  }

  @Patch('contratos/:id/encerrar')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Encerra contrato e volta imóvel para DISPONIVEL' })
  encerrarContrato(@Request() req: any, @Param('id') id: string) {
    return this.aluguelService.encerrarContrato(req.user.tenantId, id)
  }

  @Patch('contratos/:id/pagar-taxa')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Marca taxa única como paga' })
  pagarTaxa(@Request() req: any, @Param('id') id: string) {
    return this.aluguelService.pagarTaxa(req.user.tenantId, id)
  }
}
