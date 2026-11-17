import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { ConversasService } from './conversas.service'
import { EnviarTextoDto, IniciarConversaDto } from './dto/conversas.dto'

type RequisicaoAutenticada = { user: { id: string; tenantId: string } }

// Todos os usuários da imobiliária veem e respondem às conversas (decisão de escopo).
@UseGuards(JwtAuthGuard)
@Controller('conversas')
export class ConversasController {
  constructor(private readonly conversas: ConversasService) {}

  @Get()
  listar(@Req() req: RequisicaoAutenticada) {
    return this.conversas.listar(req.user.tenantId)
  }

  @Get('contagens')
  contagens(@Req() req: RequisicaoAutenticada) {
    return this.conversas.contagens(req.user.tenantId)
  }

  @Post('iniciar')
  iniciar(@Req() req: RequisicaoAutenticada, @Body() dto: IniciarConversaDto) {
    return this.conversas.iniciarComTemplate(req.user.tenantId, req.user.id, dto)
  }

  @Get(':id/mensagens')
  mensagens(@Req() req: RequisicaoAutenticada, @Param('id') id: string) {
    return this.conversas.mensagens(req.user.tenantId, id)
  }

  @Post(':id/mensagens')
  enviarTexto(@Req() req: RequisicaoAutenticada, @Param('id') id: string, @Body() dto: EnviarTextoDto) {
    return this.conversas.enviarTexto(req.user.tenantId, req.user.id, id, dto.texto)
  }

  @Post(':id/assumir')
  assumir(@Req() req: RequisicaoAutenticada, @Param('id') id: string) {
    return this.conversas.assumir(req.user.tenantId, req.user.id, id)
  }

  @Post(':id/resolver')
  resolver(@Req() req: RequisicaoAutenticada, @Param('id') id: string) {
    return this.conversas.resolver(req.user.tenantId, id)
  }
}
