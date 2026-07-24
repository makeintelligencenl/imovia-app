import { Injectable, BadRequestException } from '@nestjs/common'

@Injectable()
export class TurnstileService {
  async verify(token: string): Promise<void> {
    const secret = process.env.TURNSTILE_SECRET_KEY
    if (!secret) return // sem chave configurada, pula verificação (dev)

    const body = new URLSearchParams({ secret, response: token })
    const res  = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method:  'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body:    body.toString(),
    })
    const json = await res.json() as { success: boolean }
    if (!json.success) throw new BadRequestException('Verificação de segurança falhou')
  }
}
