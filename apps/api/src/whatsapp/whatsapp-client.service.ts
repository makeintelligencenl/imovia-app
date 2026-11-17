import { BadRequestException, Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { createHmac, timingSafeEqual } from 'crypto'
import { ConfiguracaoWhatsappService, CredenciaisWhatsapp } from './configuracao-whatsapp.service'
import { WhatsappApiError } from './whatsapp-client.errors'
import type {
  ParametroTemplate,
  WhatsappInfoNumero,
  WhatsappMidiaBaixada,
  WhatsappTemplate,
  WhatsappTipoMidia,
} from './whatsapp-client.types'
import { descreverTemplate, type TemplateBruto } from './template-whatsapp.util'

const CAMPO_META_POR_TIPO: Record<WhatsappTipoMidia, string> = {
  imagem: 'image',
  audio: 'audio',
  documento: 'document',
}

function limparTextoDoParametro(texto: string): string {
  return texto.replace(/[\r\n\t]+/g, ' ').replace(/ {5,}/g, '    ').trim()
}

function paraParametroDaMeta(parametro: ParametroTemplate) {
  return typeof parametro === 'string'
    ? { type: 'text', text: limparTextoDoParametro(parametro) }
    : { type: 'text', parameter_name: parametro.nome, text: limparTextoDoParametro(parametro.valor) }
}

@Injectable()
export class WhatsappClientService {
  private static readonly BASE_URL = 'https://graph.facebook.com/v21.0'
  private static readonly VALIDADE_CACHE_TEMPLATES_MS = 10 * 60 * 1000
  private readonly cacheTemplates = new Map<string, { em: number; dados: WhatsappTemplate[] }>()

  constructor(
    private readonly config: ConfigService,
    private readonly configuracaoWhatsapp: ConfiguracaoWhatsappService,
  ) {}

  private get appSecret(): string {
    return this.config.getOrThrow<string>('WHATSAPP_APP_SECRET')
  }

  private get appId(): string {
    return this.config.getOrThrow<string>('META_APP_ID')
  }

  async trocarCodigoPorToken(codigo: string): Promise<string> {
    const path = '/oauth/access_token'
    const res = await fetch(`${WhatsappClientService.BASE_URL}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: this.appId, client_secret: this.appSecret, code: codigo }),
    })
    if (!res.ok) {
      const corpo = (await res.json().catch(() => ({}))) as { error?: { message?: string } }
      throw new WhatsappApiError(res.status, path, corpo.error?.message ?? res.statusText)
    }
    const dados = (await res.json()) as { access_token: string }
    return dados.access_token
  }

  async descobrirContasDoToken(accessToken: string): Promise<string[]> {
    const tokenDoApp = `${this.appId}|${this.appSecret}`
    const resposta = await this.request<{
      data?: { granular_scopes?: { scope: string; target_ids?: string[] }[] }
    }>(tokenDoApp, 'GET', `/debug_token?input_token=${encodeURIComponent(accessToken)}`)
    const escopo = resposta.data?.granular_scopes?.find((s) => s.scope === 'whatsapp_business_management')
    return escopo?.target_ids ?? []
  }

  // Lê as empresas (Business Managers) do usuário que fez o login. A chamada não altera nada: serve
  // para a Meta registrar o uso da permissão business_management pelo próprio app.
  async listarEmpresasDoToken(accessToken: string): Promise<void> {
    await this.request<{ data?: unknown[] }>(accessToken, 'GET', '/me/businesses')
  }

  async listarNumerosDaConta(accessToken: string, businessAccountId: string): Promise<string[]> {
    const resposta = await this.request<{ data: { id: string }[] }>(
      accessToken,
      'GET',
      `/${businessAccountId}/phone_numbers?fields=id&limit=100`,
    )
    return resposta.data.map((numero) => numero.id)
  }

  async assinarAppNaConta(accessToken: string, businessAccountId: string): Promise<void> {
    await this.request<{ success: boolean }>(accessToken, 'POST', `/${businessAccountId}/subscribed_apps`)
  }

  async desassinarAppDaConta(accessToken: string, businessAccountId: string): Promise<void> {
    await this.request<{ success: boolean }>(accessToken, 'DELETE', `/${businessAccountId}/subscribed_apps`)
  }

  private async credenciaisOuFalhar(tenantId: string): Promise<CredenciaisWhatsapp> {
    const credenciais = await this.configuracaoWhatsapp.obterCredenciais(tenantId)
    if (!credenciais) {
      throw new BadRequestException('O WhatsApp ainda não foi conectado. Configure em Configurações → WhatsApp.')
    }
    return credenciais
  }

  async enviarTexto(tenantId: string, paraTelefone: string, texto: string): Promise<string> {
    const { accessToken, phoneNumberId } = await this.credenciaisOuFalhar(tenantId)
    const resposta = await this.request<{ messages: { id: string }[] }>(
      accessToken,
      'POST',
      `/${phoneNumberId}/messages`,
      { messaging_product: 'whatsapp', to: paraTelefone, type: 'text', text: { body: texto } },
    )
    return resposta.messages[0].id
  }

  async enviarTemplate(
    tenantId: string,
    paraTelefone: string,
    nomeTemplate: string,
    idioma: string,
    parametrosCorpo?: ParametroTemplate[],
  ): Promise<string> {
    const { accessToken, phoneNumberId } = await this.credenciaisOuFalhar(tenantId)
    const components =
      parametrosCorpo && parametrosCorpo.length > 0
        ? [{ type: 'body', parameters: parametrosCorpo.map(paraParametroDaMeta) }]
        : undefined

    const resposta = await this.request<{ messages: { id: string }[] }>(
      accessToken,
      'POST',
      `/${phoneNumberId}/messages`,
      {
        messaging_product: 'whatsapp',
        to: paraTelefone,
        type: 'template',
        template: { name: nomeTemplate, language: { code: idioma }, ...(components ? { components } : {}) },
      },
    )
    return resposta.messages[0].id
  }

  async listarTemplates(tenantId: string, opcoes: { atualizar?: boolean } = {}): Promise<WhatsappTemplate[]> {
    const cache = this.cacheTemplates.get(tenantId)
    if (!opcoes.atualizar && cache && Date.now() - cache.em < WhatsappClientService.VALIDADE_CACHE_TEMPLATES_MS) {
      return cache.dados
    }
    const { accessToken, businessAccountId } = await this.credenciaisOuFalhar(tenantId)
    const resposta = await this.request<{ data: TemplateBruto[] }>(
      accessToken,
      'GET',
      `/${businessAccountId}/message_templates?fields=name,status,category,language,parameter_format,components&limit=100`,
    )
    const dados = resposta.data.map(descreverTemplate)
    this.cacheTemplates.set(tenantId, { em: Date.now(), dados })
    return dados
  }

  async buscarInfoNumero(tenantId: string): Promise<WhatsappInfoNumero> {
    const { accessToken, phoneNumberId } = await this.credenciaisOuFalhar(tenantId)
    return this.request<WhatsappInfoNumero>(
      accessToken,
      'GET',
      `/${phoneNumberId}?fields=display_phone_number,verified_name,quality_rating,code_verification_status`,
    )
  }

  async enviarMidia(
    tenantId: string,
    paraTelefone: string,
    tipo: WhatsappTipoMidia,
    buffer: Buffer,
    mimeType: string,
    legenda?: string,
    nomeArquivo?: string,
  ): Promise<string> {
    const { accessToken, phoneNumberId } = await this.credenciaisOuFalhar(tenantId)
    const mediaId = await this.enviarArquivoParaMeta(accessToken, phoneNumberId, buffer, mimeType)
    const campoTipo = CAMPO_META_POR_TIPO[tipo]
    const conteudo: Record<string, string> = { id: mediaId }
    if (legenda && tipo !== 'audio') conteudo.caption = legenda
    if (nomeArquivo && tipo === 'documento') conteudo.filename = nomeArquivo

    const resposta = await this.request<{ messages: { id: string }[] }>(
      accessToken,
      'POST',
      `/${phoneNumberId}/messages`,
      { messaging_product: 'whatsapp', to: paraTelefone, type: campoTipo, [campoTipo]: conteudo },
    )
    return resposta.messages[0].id
  }

  private async enviarArquivoParaMeta(
    accessToken: string,
    phoneNumberId: string,
    buffer: Buffer,
    mimeType: string,
  ): Promise<string> {
    const formData = new FormData()
    formData.append('messaging_product', 'whatsapp')
    formData.append('file', new Blob([buffer], { type: mimeType }))

    const path = `/${phoneNumberId}/media`
    const res = await fetch(`${WhatsappClientService.BASE_URL}${path}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
      body: formData,
    })
    if (!res.ok) {
      const corpo = (await res.json().catch(() => ({}))) as { error?: { message?: string } }
      throw new WhatsappApiError(res.status, path, corpo.error?.message ?? res.statusText)
    }
    const dados = (await res.json()) as { id: string }
    return dados.id
  }

  async baixarMidia(tenantId: string, mediaId: string): Promise<WhatsappMidiaBaixada> {
    const { accessToken } = await this.credenciaisOuFalhar(tenantId)
    const info = await this.request<{ url: string; mime_type: string }>(accessToken, 'GET', `/${mediaId}`)

    const res = await fetch(info.url, { headers: { Authorization: `Bearer ${accessToken}` } })
    if (!res.ok) {
      throw new WhatsappApiError(res.status, `/${mediaId}`, 'Falha ao baixar mídia da Meta.')
    }
    const arrayBuffer = await res.arrayBuffer()
    return { buffer: Buffer.from(arrayBuffer), mimeType: info.mime_type }
  }

  validarAssinatura(payloadCru: Buffer, assinaturaHeader: string | undefined): boolean {
    if (!assinaturaHeader?.startsWith('sha256=')) return false

    const recebido = assinaturaHeader.slice('sha256='.length)
    if (!/^[0-9a-f]{64}$/i.test(recebido)) return false

    const esperado = createHmac('sha256', this.appSecret).update(payloadCru).digest('hex')
    return timingSafeEqual(Buffer.from(recebido, 'hex'), Buffer.from(esperado, 'hex'))
  }

  private async request<T>(accessToken: string, method: string, path: string, body?: unknown): Promise<T> {
    const res = await fetch(`${WhatsappClientService.BASE_URL}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    })

    if (!res.ok) {
      const corpo = (await res.json().catch(() => ({}))) as { error?: { message?: string } }
      throw new WhatsappApiError(res.status, path, corpo.error?.message ?? res.statusText)
    }

    return res.json() as Promise<T>
  }
}
