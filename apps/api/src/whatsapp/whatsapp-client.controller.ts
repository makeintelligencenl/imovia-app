import { Body, Controller, Delete, Get, Patch, Post, Req, UseGuards } from '@nestjs/common'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { Roles, RolesGuard } from '../auth/guards/roles.guard'
import { ConfiguracaoWhatsappService } from './configuracao-whatsapp.service'
import { ConexaoWhatsappService } from './conexao-whatsapp.service'
import { ConectarWhatsappDto } from './dto/conectar-whatsapp.dto'
import { SalvarConfiguracaoWhatsappDto } from './dto/salvar-configuracao-whatsapp.dto'
import { WhatsappClientService } from './whatsapp-client.service'

type RequisicaoAutenticada = { user: { tenantId: string } }

@Controller('whatsapp')
export class WhatsappClientController {
  constructor(
    private readonly configuracaoWhatsapp: ConfiguracaoWhatsappService,
    private readonly whatsapp: WhatsappClientService,
    private readonly conexao: ConexaoWhatsappService,
  ) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Post('conectar')
  conectar(@Req() req: RequisicaoAutenticada, @Body() dto: ConectarWhatsappDto) {
    return this.conexao.concluirConexao(req.user.tenantId, dto)
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Get('configuracao')
  buscarConfiguracao(@Req() req: RequisicaoAutenticada) {
    return this.configuracaoWhatsapp.buscar(req.user.tenantId)
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Patch('configuracao')
  salvarConfiguracao(@Req() req: RequisicaoAutenticada, @Body() dto: SalvarConfiguracaoWhatsappDto) {
    return this.configuracaoWhatsapp.salvar(req.user.tenantId, dto)
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Delete('configuracao')
  async desconectar(@Req() req: RequisicaoAutenticada) {
    await this.conexao.desconectar(req.user.tenantId)
    return { desconectado: true }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Get('conta')
  buscarConta(@Req() req: RequisicaoAutenticada) {
    return this.whatsapp.buscarInfoNumero(req.user.tenantId)
  }

  @UseGuards(JwtAuthGuard)
  @Get('templates')
  listarTemplates(@Req() req: RequisicaoAutenticada) {
    return this.whatsapp.listarTemplates(req.user.tenantId, { atualizar: true })
  }
}
