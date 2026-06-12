import { Controller, Get, Post, Patch, Param, Query, Body, Request, UseGuards } from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import { FinanceiroService } from './financeiro.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { RolesGuard, Roles } from '../auth/guards/roles.guard'

@ApiTags('financeiro')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('financeiro')
export class FinanceiroController {
  constructor(private readonly financeiroService: FinanceiroService) {}

  @Get('config')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Retorna configuração de comissão do tenant' })
  getConfig(@Request() req: any) {
    return this.financeiroService.getConfig(req.user.tenantId)
  }

  @Patch('config')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Atualiza configuração de comissão do tenant' })
  updateConfig(
    @Request() req: any,
    @Body() dto: { percentualTotal: number; splitImobiliaria: number; splitCorretor: number },
  ) {
    return this.financeiroService.updateConfig(req.user.tenantId, dto)
  }

  @Get('fechamento/:matchId')
  @ApiOperation({ summary: 'Dados pré-preenchidos para o modal de fechamento de venda' })
  dadosFechamento(@Request() req: any, @Param('matchId') matchId: string) {
    return this.financeiroService.dadosFechamento(req.user.tenantId, matchId)
  }

  @Post('fechar-venda')
  @ApiOperation({ summary: 'Registra etapa Fechado + comissões confirmadas pelo usuário' })
  fecharVenda(
    @Request() req: any,
    @Body() dto: {
      matchId:          string
      etapaId:          string
      valorImovel:      number
      percImobiliaria:  number
      valorImobiliaria: number
      percCorretor:     number
      valorCorretor:    number
    },
  ) {
    return this.financeiroService.fecharVenda(req.user.tenantId, req.user.sub, dto)
  }

  @Get('resumo')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Resumo financeiro do período' })
  resumo(@Request() req: any, @Query('periodo') periodo?: string) {
    return this.financeiroService.resumo(req.user.tenantId, periodo)
  }

  @Get('comissoes')
  @ApiOperation({ summary: 'Lista comissões com filtros (CORRETOR vê apenas as próprias)' })
  listar(
    @Request() req: any,
    @Query('tipo')       tipo?:       string,
    @Query('status')     status?:     string,
    @Query('corretorId') corretorId?: string,
    @Query('periodo')    periodo?:    string,
  ) {
    return this.financeiroService.listar(req.user.tenantId, { tipo, status, corretorId, periodo }, req.user)
  }

  @Patch('comissoes/:id/pagar')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Marca uma comissão como paga' })
  marcarPago(@Request() req: any, @Param('id') id: string) {
    return this.financeiroService.marcarPago(req.user.tenantId, id)
  }
}
