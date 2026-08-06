import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Resend } from 'resend'

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name)
  private resend: Resend

  constructor(private config: ConfigService) {
    this.resend = new Resend(config.get('RESEND_API_KEY') || 'dummy')
  }

  async enviarMatchEmail(email: string, nome: string, imovel: any) {
    const resendKey = this.config.get('RESEND_API_KEY')
    if (!resendKey) {
      this.logger.warn(`Email desabilitado (RESEND_API_KEY não configurada). Destinatário: ${email}`)
      return
    }

    const finalidade = imovel.finalidade === 'ALUGUEL' ? 'alugar' : 'comprar'
    const preco = Number(imovel.preco).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

    try {
      // O SDK do Resend não lança exceção em erro de API (domínio não verificado,
      // remetente inválido, etc.) — ele retorna { data, error }. Sem checar `error`
      // aqui, a falha passava em silêncio (sem log, sem exceção).
      const { error } = await this.resend.emails.send({
        from: this.config.get('EMAIL_FROM', 'noreply@corretorInteligente.com.br'),
        to: email,
        subject: `Encontramos um imóvel para você — ${imovel.titulo}`,
        html: this.buildEmailHtml(nome, imovel, preco, finalidade),
      })
      if (error) throw new Error(error.message)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      this.logger.error(`Falha ao enviar email para ${email}: ${message}`)
      throw err
    }
  }

  async enviarCredenciaisAcesso(dados: { nome: string; email: string; senha: string; empresa: string }) {
    const resendKey = this.config.get('RESEND_API_KEY')
    if (!resendKey) {
      this.logger.warn(`Email de credenciais desabilitado (RESEND_API_KEY ausente). Destinatário: ${dados.email}`)
      return
    }
    try {
      const { error } = await this.resend.emails.send({
        from: this.config.get('EMAIL_FROM', 'noreply@corretorInteligente.com.br'),
        to: dados.email,
        subject: `Bem-vindo ao ImovIA — suas credenciais de acesso`,
        html: this.buildCredenciaisHtml(dados),
      })
      if (error) throw new Error(error.message)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      this.logger.error(`Falha ao enviar credenciais para ${dados.email}: ${message}`)
      throw err
    }
  }

  private buildCredenciaisHtml(dados: { nome: string; email: string; senha: string; empresa: string }): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Bem-vindo ao ImovIA, ${dados.nome}!</h2>
        <p>Sua conta para <strong>${dados.empresa}</strong> foi criada. Use as credenciais abaixo para o primeiro acesso:</p>
        <div style="background: #f5f5f5; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <p><strong>Email:</strong> ${dados.email}</p>
          <p><strong>Senha temporária:</strong> <code style="background:#e2e8f0;padding:2px 6px;border-radius:4px;">${dados.senha}</code></p>
        </div>
        <p style="color:#dc2626;"><strong>⚠️ Você será solicitado a criar uma nova senha no primeiro login.</strong></p>
        <p style="color:#888;font-size:12px;">Por segurança, não compartilhe este email com terceiros.</p>
      </div>
    `
  }

  async enviarDemoRequestEmail(dados: { nome: string; email: string; telefone: string; empresa: string }) {
    const resendKey = this.config.get('RESEND_API_KEY')
    const to = this.config.get('DEMO_NOTIFICATION_EMAIL')
    if (!resendKey || !to) {
      this.logger.warn(
        `Notificação de demo desabilitada (RESEND_API_KEY/DEMO_NOTIFICATION_EMAIL ausente). Lead: ${dados.email}`,
      )
      return
    }

    try {
      const { error } = await this.resend.emails.send({
        from: this.config.get('EMAIL_FROM', 'noreply@corretorInteligente.com.br'),
        to,
        subject: `Nova solicitação de demonstração — ${dados.empresa}`,
        html: this.buildDemoRequestHtml(dados),
      })
      if (error) throw new Error(error.message)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      this.logger.error(`Falha ao enviar email de demo request (${dados.email}): ${message}`)
      throw err
    }
  }

  private buildDemoRequestHtml(dados: { nome: string; email: string; telefone: string; empresa: string }): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Nova solicitação de demonstração</h2>
        <div style="background: #f5f5f5; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <p><strong>Nome:</strong> ${dados.nome}</p>
          <p><strong>Empresa:</strong> ${dados.empresa}</p>
          <p><strong>Email:</strong> ${dados.email}</p>
          <p><strong>Telefone:</strong> ${dados.telefone}</p>
        </div>
      </div>
    `
  }

  private buildEmailHtml(nome: string, imovel: any, preco: string, finalidade: string): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Olá, ${nome}!</h2>
        <p>Encontramos um imóvel que pode ser exatamente o que você procura.</p>
        <div style="background: #f5f5f5; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <h3>${imovel.titulo}</h3>
          <p><strong>Tipo:</strong> ${imovel.tipo}</p>
          <p><strong>Finalidade:</strong> Para ${finalidade}</p>
          <p><strong>Preço:</strong> ${preco}</p>
          <p><strong>Área:</strong> ${imovel.areaM2} m²</p>
          ${imovel.quartos ? `<p><strong>Quartos:</strong> ${imovel.quartos}</p>` : ''}
          <p><strong>Localização:</strong> ${imovel.bairro}, ${imovel.cidade} - ${imovel.estado}</p>
          ${imovel.descricao ? `<p><strong>Descrição:</strong> ${imovel.descricao}</p>` : ''}
        </div>
        <p>Se tiver interesse, responda este email ou entre em contato conosco.</p>
        <p style="color: #888; font-size: 12px;">
          Você recebeu este email porque cadastrou um perfil de busca em nossa plataforma.
        </p>
      </div>
    `
  }
}
