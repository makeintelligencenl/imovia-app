import { BadRequestException, Body, Controller, Get, Param, Patch, Req, UseGuards } from '@nestjs/common'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { Roles, RolesGuard } from '../auth/guards/roles.guard'
import { ChavesIaService, PROVEDORES_IA } from './chaves-ia.service'
import { ProvedorIa } from './modelos-agente'

type RequisicaoAutenticada = { user: { tenantId: string } }

@Controller('chaves-ia')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class ChavesIaController {
  constructor(private readonly chaves: ChavesIaService) {}

  @Get()
  listar(@Req() req: RequisicaoAutenticada) {
    return this.chaves.listar(req.user.tenantId)
  }

  @Patch(':provedor')
  salvar(
    @Req() req: RequisicaoAutenticada,
    @Param('provedor') provedor: string,
    @Body() corpo: { apiKey?: string },
  ) {
    if (!PROVEDORES_IA.includes(provedor as ProvedorIa)) {
      throw new BadRequestException('Provedor de IA desconhecido.')
    }
    if (!corpo?.apiKey || typeof corpo.apiKey !== 'string') {
      throw new BadRequestException('Informe a chave de API.')
    }
    return this.chaves.salvar(req.user.tenantId, provedor as ProvedorIa, corpo.apiKey)
  }
}
