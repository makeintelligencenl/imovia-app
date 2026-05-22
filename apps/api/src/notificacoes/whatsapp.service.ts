import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name)
  private apiUrl: string
  private apiKey: string

  constructor(private config: ConfigService) {
    this.apiUrl = config.get('EVOLUTION_API_URL', '')
    this.apiKey = config.get('EVOLUTION_API_KEY', '')
  }

  async enviarMatchWhatsapp(telefone: string, nome: string, imovel: any) {
    if (!this.apiUrl || !this.apiKey) {
      this.logger.warn('Evolution API não configurada — WhatsApp desabilitado')
      return
    }

    const preco = Number(imovel.preco).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
    const finalidade = imovel.finalidade === 'ALUGUEL' ? 'alugar' : 'comprar'

    const mensagem = `Olá, ${nome}! 🏠

Encontramos um imóvel que combina com o seu perfil de busca:

*${imovel.titulo}*
• Tipo: ${imovel.tipo}
• Para: ${finalidade}
• Preço: ${preco}
• Área: ${imovel.areaM2} m²
${imovel.quartos ? `• Quartos: ${imovel.quartos}` : ''}
• Local: ${imovel.bairro}, ${imovel.cidade} - ${imovel.estado}

Tem interesse? Responda esta mensagem e um de nossos corretores entrará em contato! 😊`

    try {
      const response = await fetch(`${this.apiUrl}/message/sendText/default`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: this.apiKey,
        },
        body: JSON.stringify({ number: telefone, text: mensagem }),
      })

      if (!response.ok) {
        throw new Error(`Evolution API retornou ${response.status}`)
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      this.logger.error(`Falha ao enviar WhatsApp para ${telefone}: ${message}`)
      throw err
    }
  }
}
