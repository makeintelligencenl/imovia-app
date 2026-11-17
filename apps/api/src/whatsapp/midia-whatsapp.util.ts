// Regras de mídia do WhatsApp: tipos aceitos e limites oficiais da Cloud API.
export type TipoMidiaChat = 'imagem' | 'audio' | 'video' | 'documento'

const MB = 1024 * 1024

const REGRAS: Record<TipoMidiaChat, { limiteBytes: number; mimetypes: string[] }> = {
  imagem: { limiteBytes: 5 * MB, mimetypes: ['image/jpeg', 'image/png'] },
  audio: { limiteBytes: 16 * MB, mimetypes: ['audio/ogg', 'audio/mpeg', 'audio/mp4', 'audio/aac', 'audio/amr'] },
  video: { limiteBytes: 16 * MB, mimetypes: ['video/mp4', 'video/3gpp'] },
  documento: {
    limiteBytes: 100 * MB,
    mimetypes: [
      'application/pdf',
      'application/msword',
      'application/vnd.ms-excel',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain',
    ],
  },
}

// Tipo do WhatsApp pelo mimetype (ignora parâmetros como "; codecs=opus").
export function tipoPorMimetype(mimetype: string): TipoMidiaChat | null {
  const base = mimetype.split(';')[0].trim().toLowerCase()
  for (const tipo of Object.keys(REGRAS) as TipoMidiaChat[]) {
    if (REGRAS[tipo].mimetypes.includes(base)) return tipo
  }
  return null
}

// Retorna a mensagem de erro para o usuário, ou null se o arquivo pode ser enviado.
export function validarMidia(mimetype: string, tamanhoBytes: number): string | null {
  const tipo = tipoPorMimetype(mimetype)
  if (!tipo) return 'Tipo de arquivo não aceito pelo WhatsApp.'
  if (tamanhoBytes > REGRAS[tipo].limiteBytes) {
    return `Arquivo acima do limite de ${REGRAS[tipo].limiteBytes / MB} MB para ${tipo}.`
  }
  return null
}

// Caminho no bucket: separado por conversa e sem caracteres que compliquem a URL.
export function caminhoDaMidia(tenantId: string, conversaId: string, identificador: string, extensao: string): string {
  const seguro = identificador.replace(/[^A-Za-z0-9_-]/g, '_')
  return `${tenantId}/${conversaId}/${seguro}.${extensao}`
}

export function extensaoPorMimetype(mimetype: string): string {
  const base = mimetype.split(';')[0].trim().toLowerCase()
  const mapa: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'audio/ogg': 'ogg',
    'audio/mpeg': 'mp3',
    'audio/mp4': 'm4a',
    'audio/aac': 'aac',
    'audio/amr': 'amr',
    'video/mp4': 'mp4',
    'video/3gpp': '3gp',
    'application/pdf': 'pdf',
    'text/plain': 'txt',
  }
  return mapa[base] ?? 'bin'
}
