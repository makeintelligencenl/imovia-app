import { extrairStatusEntrega, podeAvancarStatus, WhatsappWebhookPayload } from './webhook-payload.util'

function payloadComStatuses(statuses: unknown[]): WhatsappWebhookPayload {
  return {
    entry: [{ changes: [{ field: 'messages', value: { statuses: statuses as never[] } }] }],
  }
}

describe('extrairStatusEntrega', () => {
  it('converte sent, delivered, read e failed para os status internos', () => {
    const atualizacoes = extrairStatusEntrega(
      payloadComStatuses([
        { id: 'wamid.a', status: 'sent', timestamp: '1700000000' },
        { id: 'wamid.b', status: 'delivered', timestamp: '1700000001' },
        { id: 'wamid.c', status: 'read', timestamp: '1700000002' },
        { id: 'wamid.d', status: 'failed', timestamp: '1700000003', errors: [{ code: 131026, title: 'Mensagem não entregue' }] },
      ]),
    )

    expect(atualizacoes.map((a) => [a.waMessageId, a.status])).toEqual([
      ['wamid.a', 'ENVIADA'],
      ['wamid.b', 'ENTREGUE'],
      ['wamid.c', 'LIDA'],
      ['wamid.d', 'FALHOU'],
    ])
    expect(atualizacoes[3].motivo).toBe('Mensagem não entregue')
    expect(atualizacoes[0].motivo).toBeNull()
  })

  it('ignora status desconhecidos e avisos sem id', () => {
    const atualizacoes = extrairStatusEntrega(
      payloadComStatuses([
        { id: 'wamid.x', status: 'deleted' },
        { status: 'sent' },
      ]),
    )
    expect(atualizacoes).toEqual([])
  })
})

describe('podeAvancarStatus', () => {
  it('avança na ordem ENVIADA, ENTREGUE, LIDA', () => {
    expect(podeAvancarStatus(null, 'ENVIADA')).toBe(true)
    expect(podeAvancarStatus('ENVIADA', 'ENTREGUE')).toBe(true)
    expect(podeAvancarStatus('ENTREGUE', 'LIDA')).toBe(true)
  })

  it('não volta para um status anterior', () => {
    expect(podeAvancarStatus('LIDA', 'ENTREGUE')).toBe(false)
    expect(podeAvancarStatus('ENTREGUE', 'ENVIADA')).toBe(false)
    expect(podeAvancarStatus('LIDA', 'FALHOU')).toBe(false)
  })
})
