import { Controller, Get, Post, Put, Delete, Param, Query, Body, Request, UseGuards } from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import { ChatsService } from './chats.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { RolesGuard, Roles } from '../auth/guards/roles.guard'

@ApiTags('chats')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('chats')
export class ChatsController {
  constructor(private readonly chatsService: ChatsService) {}

  // ADMIN only — listagem geral de todos os chats da imobiliária
  @Get()
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Lista chats do GPT Maker' })
  listar(
    @Query('page')     page?:     string,
    @Query('pageSize') pageSize?: string,
    @Query('agentId')  agentId?:  string,
    @Query('search')   search?:   string,
    @Query('finished') finished?: string,
  ) {
    return this.chatsService.listarChats({ page, pageSize, agentId, search, finished })
  }

  // ADMIN + CORRETOR — operações de atendimento
  @Get(':chatId/messages')
  @ApiOperation({ summary: 'Lista mensagens de um chat' })
  mensagens(
    @Request() req: any,
    @Param('chatId')   chatId:    string,
    @Query('page')     page?:     string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.chatsService.listarMensagens(req.user.tenantId, chatId, { page, pageSize })
  }

  @Post(':chatId/messages')
  @ApiOperation({ summary: 'Envia mensagem em um chat' })
  enviar(@Request() req: any, @Param('chatId') chatId: string, @Body('message') message: string) {
    return this.chatsService.enviarMensagem(req.user.tenantId, chatId, message)
  }

  @Post(':chatId/assume')
  @ApiOperation({ summary: 'Assume atendimento humano (pausa IA)' })
  assumir(@Request() req: any, @Param('chatId') chatId: string) {
    return this.chatsService.assumirAtendimento(req.user.tenantId, chatId)
  }

  @Post(':chatId/end')
  @ApiOperation({ summary: 'Encerra atendimento humano (retorna IA)' })
  encerrar(@Request() req: any, @Param('chatId') chatId: string) {
    return this.chatsService.encerrarAtendimento(req.user.tenantId, chatId)
  }

  @Post(':chatId/resolve')
  @ApiOperation({ summary: 'Marca o chat como resolvido/finalizado' })
  resolver(@Request() req: any, @Param('chatId') chatId: string) {
    return this.chatsService.resolverChat(req.user.tenantId, chatId)
  }

  // ADMIN only — edição/exclusão de mensagens e configurações
  @Put(':chatId/messages/:messageId')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Edita uma mensagem' })
  editarMensagem(
    @Request() req: any,
    @Param('chatId')    chatId:    string,
    @Param('messageId') messageId: string,
    @Body('message')    message:   string,
  ) {
    return this.chatsService.editarMensagem(req.user.tenantId, chatId, messageId, message)
  }

  @Delete(':chatId/messages/:messageId')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Exclui uma mensagem' })
  excluirMensagem(
    @Request() req: any,
    @Param('chatId')    chatId:    string,
    @Param('messageId') messageId: string,
  ) {
    return this.chatsService.excluirMensagem(req.user.tenantId, chatId, messageId)
  }

  @Get('client-names')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Retorna mapa de gptMakerChatId → nome do cliente' })
  clientNames(@Request() req: any) {
    return this.chatsService.clientNamesByChatId(req.user.tenantId)
  }

  // ADMIN + CORRETOR — consulta match do lead pelo chat
  @Get(':chatId/match-info')
  @ApiOperation({ summary: 'Retorna match associado ao chat pelo chatId ou telefone do lead' })
  matchInfo(
    @Param('chatId') chatId: string,
    @Request() req: any,
    @Query('phone') phone: string,
  ) {
    return this.chatsService.infoMatch(req.user.tenantId, phone, chatId)
  }
}
