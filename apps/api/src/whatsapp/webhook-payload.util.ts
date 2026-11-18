// Estrutura mínima do webhook da Meta. Statuses ainda não são processados.
export type WhatsappWebhookPayload = {
  entry?: {
    id?: string
    time?: number
    changes?: {
      field?: string
      value?: {
        event?: string
        waba_info?: { waba_id?: string }
        metadata?: { phone_number_id?: string }
        contacts?: { wa_id?: string; profile?: { name?: string } }[]
        messages?: {
          id?: string
          from?: string
          timestamp?: string
          type?: string
          text?: { body?: string }
          image?: { id?: string; mime_type?: string; caption?: string }
          audio?: { id?: string; mime_type?: string }
          video?: { id?: string; mime_type?: string; caption?: string }
          document?: { id?: string; mime_type?: string; filename?: string; caption?: string }
        }[]
        statuses?: {
          id?: string
          status?: string
          timestamp?: string
          errors?: { code?: number; title?: string; message?: string }[]
        }[]
      }
    }[]
  }[]
}

export type MensagemRecebida = {
  waMessageId: string
  de: string
  nomeContato: string | null
  tipo: string
  texto: string | null
  criadaEm: Date
  // Mídia recebida: id para baixar na API da Meta e mimetype declarado pela Meta.
  midiaId: string | null
  midiaMimeType: string | null
}

// Tipos de mídia que a Meta envia com um id para download.
const TIPOS_COM_MIDIA = ['image', 'audio', 'video', 'document'] as const

type MensagemPayload = {
  id?: string
  from?: string
  timestamp?: string
  type?: string
  text?: { body?: string }
  image?: { id?: string; mime_type?: string; caption?: string }
  audio?: { id?: string; mime_type?: string }
  video?: { id?: string; mime_type?: string; caption?: string }
  document?: { id?: string; mime_type?: string; filename?: string; caption?: string }
}

function midiaDaMensagem(msg: MensagemPayload): { midiaId: string | null; midiaMimeType: string | null } {
  const tipo = TIPOS_COM_MIDIA.find((t) => msg.type === t)
  if (!tipo) return { midiaId: null, midiaMimeType: null }
  const midia = msg[tipo]
  return { midiaId: midia?.id ?? null, midiaMimeType: midia?.mime_type ?? null }
}

function legendaDaMensagem(msg: MensagemPayload): string | null {
  return msg.text?.body ?? msg.image?.caption ?? msg.video?.caption ?? msg.document?.caption ?? null
}

export type MensagensRecebidasDoNumero = {
  phoneNumberId: string
  mensagens: MensagemRecebida[]
}

export function extrairMensagensRecebidas(payload: WhatsappWebhookPayload): MensagensRecebidasDoNumero[] {
  const porNumero: MensagensRecebidasDoNumero[] = []
  for (const entrada of payload.entry ?? []) {
    for (const mudanca of entrada.changes ?? []) {
      const valor = mudanca.value
      const phoneNumberId = valor?.metadata?.phone_number_id
      if (mudanca.field !== 'messages' || !phoneNumberId || !valor?.messages?.length) continue

      const mensagens: MensagemRecebida[] = []
      for (const msg of valor.messages) {
        if (!msg.id || !msg.from) continue
        const nomeContato = valor.contacts?.find((c) => c.wa_id === msg.from)?.profile?.name ?? null
        const segundos = Number(msg.timestamp)
        mensagens.push({
          waMessageId: msg.id,
          de: msg.from,
          nomeContato,
          tipo: msg.type ?? 'desconhecido',
          texto: legendaDaMensagem(msg),
          criadaEm: Number.isFinite(segundos) ? new Date(segundos * 1000) : new Date(),
          ...midiaDaMensagem(msg),
        })
      }
      if (mensagens.length) porNumero.push({ phoneNumberId, mensagens })
    }
  }
  return porNumero
}

// Status de entrega de mensagens enviadas (campo "messages" com "statuses" no payload da Meta).
export type StatusMensagemEnviada = 'ENVIADA' | 'ENTREGUE' | 'LIDA' | 'FALHOU'

export type AtualizacaoDeStatus = {
  waMessageId: string
  status: StatusMensagemEnviada
  motivo: string | null
  ocorridoEm: Date
}

const STATUS_DA_META: Record<string, StatusMensagemEnviada> = {
  sent: 'ENVIADA',
  delivered: 'ENTREGUE',
  read: 'LIDA',
  failed: 'FALHOU',
}

// Ordem de avanço: um status nunca volta para um anterior, e FALHOU só vale antes de chegar a ENTREGUE.
const ANTERIORES_PERMITIDOS: Record<StatusMensagemEnviada, (StatusMensagemEnviada | null)[]> = {
  ENVIADA: [null],
  ENTREGUE: [null, 'ENVIADA'],
  LIDA: [null, 'ENVIADA', 'ENTREGUE'],
  FALHOU: [null, 'ENVIADA'],
}

export function podeAvancarStatus(atual: string | null, novo: StatusMensagemEnviada): boolean {
  return (ANTERIORES_PERMITIDOS[novo] as (string | null)[]).includes(atual)
}

export function extrairStatusEntrega(payload: WhatsappWebhookPayload): AtualizacaoDeStatus[] {
  const atualizacoes: AtualizacaoDeStatus[] = []
  for (const entrada of payload.entry ?? []) {
    for (const mudanca of entrada.changes ?? []) {
      if (mudanca.field !== 'messages') continue
      for (const st of mudanca.value?.statuses ?? []) {
        const status = st.status ? STATUS_DA_META[st.status] : undefined
        if (!st.id || !status) continue
        const erro = st.errors?.[0]
        const segundos = Number(st.timestamp)
        atualizacoes.push({
          waMessageId: st.id,
          status,
          motivo: status === 'FALHOU' ? (erro?.title ?? erro?.message ?? null) : null,
          ocorridoEm: Number.isFinite(segundos) ? new Date(segundos * 1000) : new Date(),
        })
      }
    }
  }
  return atualizacoes
}

export function payloadValido(body: unknown): body is WhatsappWebhookPayload {
  if (typeof body !== 'object' || body === null) return false
  const { entry } = body as { entry?: unknown }
  if (entry === undefined) return true
  if (!Array.isArray(entry)) return false
  return entry.every((item) => {
    if (typeof item !== 'object' || item === null) return false
    const { changes } = item as { changes?: unknown }
    return changes === undefined || Array.isArray(changes)
  })
}

export type EventoConta = {
  evento: string
  wabaId: string | null
  ocorridoEm: Date
}

export function extrairEventosConta(payload: WhatsappWebhookPayload): EventoConta[] {
  const eventos: EventoConta[] = []
  for (const entrada of payload.entry ?? []) {
    for (const mudanca of entrada.changes ?? []) {
      if (mudanca.field !== 'account_update' || !mudanca.value?.event) continue
      eventos.push({
        evento: mudanca.value.event,
        wabaId: mudanca.value.waba_info?.waba_id ?? entrada.id ?? null,
        ocorridoEm: entrada.time ? new Date(entrada.time * 1000) : new Date(),
      })
    }
  }
  return eventos
}

// Resumo sem dados pessoais (sem telefones nem textos), para diagnosticar o que a Meta envia.
export function resumoDiagnostico(payload: unknown): string {
  const entradas: any[] = (payload as any)?.entry ?? []
  const partes: string[] = []
  for (const entrada of entradas) {
    for (const mudanca of entrada?.changes ?? []) {
      const valor = mudanca?.value ?? {}
      const mensagens: any[] = Array.isArray(valor.messages) ? valor.messages : []
      const statuses: any[] = Array.isArray(valor.statuses) ? valor.statuses : []
      const tipos = mensagens.map((m) => m?.type ?? 'sem-tipo').join('+') || '-'
      const estados = statuses.map((s) => s?.status ?? 'sem-status').join('+') || '-'
      const temNumero = valor?.metadata?.phone_number_id ? 'sim' : 'nao'
      partes.push(
        `campo=${mudanca?.field ?? '?'} mensagens=${mensagens.length}(${tipos}) statuses=${statuses.length}(${estados}) phone_number_id=${temNumero}`,
      )
    }
  }
  return partes.join(' | ') || 'sem changes'
}
