// Estrutura mínima do webhook da Meta. Mensagens e statuses entram na etapa do agente.
export type WhatsappWebhookPayload = {
  entry?: {
    id?: string
    time?: number
    changes?: {
      field?: string
      value?: {
        event?: string
        waba_info?: { waba_id?: string }
        messages?: unknown[]
      }
    }[]
  }[]
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
