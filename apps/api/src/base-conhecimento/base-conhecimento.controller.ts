import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { Roles, RolesGuard } from '../auth/guards/roles.guard'
import { BaseConhecimentoService, ItemBaseEntrada } from './base-conhecimento.service'

type RequisicaoAutenticada = { user: { tenantId: string } }

@Controller('base-conhecimento')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class BaseConhecimentoController {
  constructor(private readonly base: BaseConhecimentoService) {}

  @Get()
  listar(@Req() req: RequisicaoAutenticada) {
    return this.base.listar(req.user.tenantId)
  }

  @Post()
  criar(@Req() req: RequisicaoAutenticada, @Body() dto: ItemBaseEntrada) {
    return this.base.criar(req.user.tenantId, dto)
  }

  @Patch(':id')
  atualizar(@Req() req: RequisicaoAutenticada, @Param('id') id: string, @Body() dto: ItemBaseEntrada) {
    return this.base.atualizar(req.user.tenantId, id, dto)
  }

  @Delete(':id')
  async remover(@Req() req: RequisicaoAutenticada, @Param('id') id: string) {
    await this.base.remover(req.user.tenantId, id)
    return { removido: true }
  }
}
