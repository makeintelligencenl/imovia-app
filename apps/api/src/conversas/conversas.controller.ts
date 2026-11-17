import { BadRequestException, Body, Controller, Get, Param, Post, Req, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { ConversasService } from './conversas.service'
import { EnviarTextoDto, IniciarConversaDto } from './dto/conversas.dto'

type RequisicaoAutenticada = { user: { id: string; tenantId: string } }

// Maior arquivo aceito pelo WhatsApp (documento: 100 MB). O limite por tipo é validado no serviço.
const LIMITE_UPLOAD_BYTES = 100 * 1024 * 1024

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

  @Post(':id/midia')
  @UseInterceptors(FileInterceptor('arquivo', { limits: { fileSize: LIMITE_UPLOAD_BYTES } }))
  enviarMidia(
    @Req() req: RequisicaoAutenticada,
    @Param('id') id: string,
    @UploadedFile() arquivo: Express.Multer.File | undefined,
    @Body('legenda') legenda?: string,
  ) {
    if (!arquivo) throw new BadRequestException('Nenhum arquivo enviado.')
    return this.conversas.enviarMidia(req.user.tenantId, req.user.id, id, arquivo, legenda)
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
