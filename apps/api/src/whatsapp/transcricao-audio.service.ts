import { Injectable } from '@nestjs/common'
import { ChavesIaService } from '../agente/chaves-ia.service'

const URL_TRANSCRICAO = 'https://api.openai.com/v1/audio/transcriptions'
// Modelo de transcrição da OpenAI (Whisper). Confirmar o nome atual do modelo antes de publicar.
const MODELO_TRANSCRICAO = 'whisper-1'

// Transcreve áudios recebidos com a chave OpenAI da própria imobiliária.
@Injectable()
export class TranscricaoAudioService {
  constructor(private readonly chaves: ChavesIaService) {}

  // Retorna o texto falado, ou null quando a imobiliária não tem chave OpenAI cadastrada.
  async transcrever(tenantId: string, audio: Buffer, mimeType: string): Promise<string | null> {
    const chave = await this.chaves.obterChave(tenantId, 'openai')
    if (!chave) return null

    const form = new FormData()
    form.append('file', new Blob([new Uint8Array(audio)], { type: mimeType }), 'audio')
    form.append('model', MODELO_TRANSCRICAO)
    form.append('language', 'pt')

    const res = await fetch(URL_TRANSCRICAO, {
      method: 'POST',
      headers: { Authorization: `Bearer ${chave}` },
      body: form,
    })
    if (!res.ok) {
      throw new Error(`Falha na transcrição de áudio (status ${res.status}).`)
    }
    const dados = (await res.json()) as { text?: string }
    return dados.text?.trim() || null
  }
}
