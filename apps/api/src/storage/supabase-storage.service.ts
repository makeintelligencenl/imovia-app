import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

// Armazenamento de arquivos no Supabase Storage (buckets privados, acesso por URL assinada).
@Injectable()
export class SupabaseStorageService {
  constructor(private readonly config: ConfigService) {}

  private get baseUrl(): string {
    return this.config.getOrThrow<string>('SUPABASE_URL')
  }

  private get serviceRoleKey(): string {
    return this.config.getOrThrow<string>('SUPABASE_SERVICE_ROLE_KEY')
  }

  async enviarArquivo(bucket: string, caminho: string, conteudo: Buffer, contentType: string): Promise<void> {
    const res = await fetch(`${this.baseUrl}/storage/v1/object/${bucket}/${caminho}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.serviceRoleKey}`, 'Content-Type': contentType },
      body: conteudo,
    })
    if (!res.ok) {
      const corpo = await res.text().catch(() => '')
      throw new Error(`Falha ao enviar arquivo ao Supabase Storage (status ${res.status}): ${corpo}`)
    }
  }

  async gerarUrlAssinada(bucket: string, caminho: string, expiraEmSegundos = 300): Promise<string> {
    const res = await fetch(`${this.baseUrl}/storage/v1/object/sign/${bucket}/${caminho}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.serviceRoleKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ expiresIn: expiraEmSegundos }),
    })
    if (!res.ok) {
      const corpo = await res.text().catch(() => '')
      throw new Error(`Falha ao gerar URL assinada do Supabase Storage (status ${res.status}): ${corpo}`)
    }
    const dados = (await res.json()) as { signedURL: string }
    return `${this.baseUrl}/storage/v1${dados.signedURL}`
  }
}
