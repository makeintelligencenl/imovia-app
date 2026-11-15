import { BadRequestException, Injectable } from '@nestjs/common'
import { ConfiguracaoWhatsappPublica, ConfiguracaoWhatsappService } from './configuracao-whatsapp.service'
import { ConectarWhatsappDto } from './dto/conectar-whatsapp.dto'
import { WhatsappClientService } from './whatsapp-client.service'
import type { EventoConta } from './webhook-payload.util'

@Injectable()
export class ConexaoWhatsappService {
  constructor(
    private readonly whatsapp: WhatsappClientService,
    private readonly configuracao: ConfiguracaoWhatsappService,
  ) {}

  async concluirConexao(tenantId: string, dto: ConectarWhatsappDto): Promise<ConfiguracaoWhatsappPublica> {
    try {
      return await this.executarConexao(tenantId, dto)
    } catch (erro) {
      console.error('[ConexaoWhatsapp] Falha ao concluir a conexão:', (erro as Error).message)
      throw erro
    }
  }

  private async executarConexao(tenantId: string, dto: ConectarWhatsappDto): Promise<ConfiguracaoWhatsappPublica> {
    const accessToken = await this.whatsapp.trocarCodigoPorToken(dto.codigo)

    let businessAccountId = dto.businessAccountId
    if (!businessAccountId) {
      const contas = await this.whatsapp.descobrirContasDoToken(accessToken)
      if (contas.length === 0) {
        throw new BadRequestException('A Meta não informou nenhuma conta WhatsApp Business para este login.')
      }
      businessAccountId = contas[0]
    }

    const numeros = await this.whatsapp.listarNumerosDaConta(accessToken, businessAccountId)

    let phoneNumberId: string
    if (dto.phoneNumberId) {
      if (!numeros.includes(dto.phoneNumberId)) {
        throw new BadRequestException('O número informado não pertence à conta WhatsApp Business informada.')
      }
      phoneNumberId = dto.phoneNumberId
    } else if (numeros.length === 1) {
      phoneNumberId = numeros[0]
    } else {
      throw new BadRequestException(
        numeros.length === 0
          ? 'A conta WhatsApp Business não tem nenhum número conectado.'
          : 'A conta tem mais de um número; configure manualmente informando qual usar.',
      )
    }

    await this.whatsapp.assinarAppNaConta(accessToken, businessAccountId)

    return this.configuracao.salvar(tenantId, { phoneNumberId, businessAccountId, accessToken })
  }

  async desconectar(tenantId: string): Promise<void> {
    const credenciais = await this.configuracao.obterCredenciais(tenantId)
    if (!credenciais) return
    try {
      await this.whatsapp.desassinarAppDaConta(credenciais.accessToken, credenciais.businessAccountId)
    } catch (erro) {
      console.warn('[ConexaoWhatsapp] Não foi possível remover o app da conta na Meta:', (erro as Error).message)
    }
    await this.configuracao.remover(tenantId)
  }

  async tratarEventosDeConta(eventos: EventoConta[]): Promise<void> {
    for (const { evento, wabaId, ocorridoEm } of eventos) {
      console.log(`[ConexaoWhatsapp] account_update: ${evento}`)
      if (evento !== 'PARTNER_REMOVED' || !wabaId) continue
      if (await this.configuracao.removerSeContaCoincide(wabaId, ocorridoEm)) {
        console.log('[ConexaoWhatsapp] Conexão removida: a conta desconectou o app.')
      }
    }
  }
}
