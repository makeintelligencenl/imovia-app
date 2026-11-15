import { createHmac } from 'crypto'
import { ConfigService } from '@nestjs/config'
import { WhatsappClientService } from './whatsapp-client.service'
import { ConfiguracaoWhatsappService } from './configuracao-whatsapp.service'
import { criptografar, descriptografar } from './crypto.util'
import { payloadValido, extrairEventosConta } from './webhook-payload.util'
import { WhatsappWebhookController } from './whatsapp-webhook.controller'
import { ConexaoWhatsappService } from './conexao-whatsapp.service'

const SECRET = 'app-secret-teste'
const VERIFY = 'verify-token-teste'
const CHAVE = Buffer.alloc(32, 7).toString('base64')

function configDe(valores: Record<string, string>): ConfigService {
  return {
    get: (k: string) => valores[k],
    getOrThrow: (k: string) => {
      if (!(k in valores)) throw new Error(`faltando ${k}`)
      return valores[k]
    },
  } as unknown as ConfigService
}

const assinar = (corpo: Buffer, segredo = SECRET) =>
  'sha256=' + createHmac('sha256', segredo).update(corpo).digest('hex')

describe('WhatsappClientService.validarAssinatura', () => {
  const servico = new WhatsappClientService(
    configDe({ WHATSAPP_APP_SECRET: SECRET, META_APP_ID: '1' }),
    {} as ConfiguracaoWhatsappService,
  )
  const corpo = Buffer.from('{"object":"whatsapp_business_account"}')

  it('aceita assinatura válida', () => {
    expect(servico.validarAssinatura(corpo, assinar(corpo))).toBe(true)
  })

  it('rejeita segredo errado, corpo alterado, header ausente e formato inválido', () => {
    expect(servico.validarAssinatura(corpo, assinar(corpo, 'outro'))).toBe(false)
    expect(servico.validarAssinatura(Buffer.from('{}'), assinar(corpo))).toBe(false)
    expect(servico.validarAssinatura(corpo, undefined)).toBe(false)
    expect(servico.validarAssinatura(corpo, 'sha256=curto')).toBe(false)
  })
})

describe('WhatsappWebhookController.verificar', () => {
  const controller = new WhatsappWebhookController(
    {} as WhatsappClientService,
    configDe({ WHATSAPP_VERIFY_TOKEN: VERIFY }),
    {} as ConexaoWhatsappService,
  )
  const resposta = () => {
    const r = { status: jest.fn(), type: jest.fn(), send: jest.fn() }
    r.status.mockReturnValue(r)
    r.type.mockReturnValue(r)
    return r
  }

  it('devolve o challenge quando o token confere', () => {
    const res = resposta()
    controller.verificar('subscribe', VERIFY, '999', res as never)
    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.send).toHaveBeenCalledWith('999')
  })

  it('responde 403 com token errado ou modo diferente de subscribe', () => {
    const res = resposta()
    controller.verificar('subscribe', 'errado', '999', res as never)
    expect(res.status).toHaveBeenCalledWith(403)
    const res2 = resposta()
    controller.verificar('unsubscribe', VERIFY, '999', res2 as never)
    expect(res2.status).toHaveBeenCalledWith(403)
  })
})

describe('criptografia de credenciais', () => {
  it('descriptografa o que criptografou e não reconhece chave diferente', () => {
    const cifrado = criptografar('token-secreto', CHAVE)
    expect(descriptografar(cifrado, CHAVE)).toBe('token-secreto')
    const outraChave = Buffer.alloc(32, 9).toString('base64')
    expect(() => descriptografar(cifrado, outraChave)).toThrow()
  })
})

describe('payload do webhook', () => {
  it('valida estrutura mínima e extrai eventos de conta', () => {
    expect(payloadValido({ entry: [{ changes: [] }] })).toBe(true)
    expect(payloadValido({ entry: 'x' })).toBe(false)
    const eventos = extrairEventosConta({
      entry: [
        {
          id: 'waba-1',
          time: 1700000000,
          changes: [{ field: 'account_update', value: { event: 'PARTNER_REMOVED' } }],
        },
      ],
    })
    expect(eventos).toHaveLength(1)
    expect(eventos[0].evento).toBe('PARTNER_REMOVED')
    expect(eventos[0].wabaId).toBe('waba-1')
  })
})
