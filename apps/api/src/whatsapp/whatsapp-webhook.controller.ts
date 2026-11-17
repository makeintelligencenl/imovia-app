import { Controller, Get, Post, Query, Req, Res, RawBodyRequest } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { SkipThrottle } from '@nestjs/throttler'
import type { Request, Response } from 'express'
import { ConexaoWhatsappService } from './conexao-whatsapp.service'
import { MensagensWhatsappService } from './mensagens-whatsapp.service'
import { WhatsappClientService } from './whatsapp-client.service'
import { extrairEventosConta, extrairMensagensRecebidas, extrairStatusEntrega, payloadValido } from './webhook-payload.util'

@SkipThrottle()
@Controller('whatsapp/webhook')
export class WhatsappWebhookController {
  constructor(
    private readonly whatsapp: WhatsappClientService,
    private readonly config: ConfigService,
    private readonly conexao: ConexaoWhatsappService,
    private readonly mensagens: MensagensWhatsappService,
  ) {}

  @Get()
  verificar(
    @Query('hub.mode') modo: string,
    @Query('hub.verify_token') token: string,
    @Query('hub.challenge') challenge: string,
    @Res() res: Response,
  ): void {
    const esperado = this.config.get<string>('WHATSAPP_VERIFY_TOKEN')
    if (modo === 'subscribe' && esperado && token === esperado) {
      res.status(200).type('text/plain').send(challenge)
      return
    }
    res.status(403).send()
  }

  @Post()
  async receber(@Req() req: RawBodyRequest<Request>, @Res() res: Response): Promise<void> {
    if (!req.rawBody) {
      res.status(403).send()
      return
    }

    const assinatura = req.headers['x-hub-signature-256'] as string | undefined
    if (!this.whatsapp.validarAssinatura(req.rawBody, assinatura)) {
      console.warn('[WhatsappWebhook] Webhook rejeitado: assinatura inválida.')
      res.status(403).send()
      return
    }

    if (!payloadValido(req.body)) {
      const chaves = typeof req.body === 'object' && req.body !== null ? Object.keys(req.body) : typeof req.body
      console.warn('[WhatsappWebhook] Webhook com estrutura inesperada, ignorado. Chaves recebidas:', chaves)
      res.status(200).send()
      return
    }

    const campos = (req.body.entry ?? []).flatMap((e) => (e.changes ?? []).map((c) => c.field ?? 'desconhecido'))
    console.log(`[WhatsappWebhook] Webhook recebido: ${campos.join(', ') || 'sem campos'}`)

    try {
      await this.conexao.tratarEventosDeConta(extrairEventosConta(req.body))
    } catch (erro) {
      console.error('[WhatsappWebhook] Falha ao tratar evento de conta:', erro)
    }

    try {
      await this.mensagens.registrarRecebidas(extrairMensagensRecebidas(req.body))
    } catch (erro) {
      console.error('[WhatsappWebhook] Falha ao gravar mensagens recebidas:', erro)
    }

    try {
      await this.mensagens.atualizarStatusEntrega(extrairStatusEntrega(req.body))
    } catch (erro) {
      console.error('[WhatsappWebhook] Falha ao atualizar status de entrega:', erro)
    }

    res.status(200).send()
  }
}
