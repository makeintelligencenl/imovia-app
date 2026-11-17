import { caminhoDaMidia, tipoPorMimetype, validarMidia } from './midia-whatsapp.util'
import { extrairMensagensRecebidas, WhatsappWebhookPayload } from './webhook-payload.util'

const MB = 1024 * 1024

describe('regras de mídia', () => {
  it('classifica o tipo pelo mimetype, ignorando parâmetros', () => {
    expect(tipoPorMimetype('image/jpeg')).toBe('imagem')
    expect(tipoPorMimetype('audio/ogg; codecs=opus')).toBe('audio')
    expect(tipoPorMimetype('application/pdf')).toBe('documento')
    expect(tipoPorMimetype('application/x-msdownload')).toBeNull()
  })

  it('aplica os limites oficiais por tipo', () => {
    expect(validarMidia('image/png', 5 * MB)).toBeNull()
    expect(validarMidia('image/png', 5 * MB + 1)).toMatch(/limite de 5 MB/)
    expect(validarMidia('audio/mpeg', 16 * MB)).toBeNull()
    expect(validarMidia('application/pdf', 100 * MB + 1)).toMatch(/limite de 100 MB/)
    expect(validarMidia('application/x-msdownload', 1)).toMatch(/não aceito/)
  })

  it('monta caminho sem caracteres que quebram a URL', () => {
    expect(caminhoDaMidia('t1', 'c1', 'wamid.HBg=/abc', 'jpg')).toBe('t1/c1/wamid_HBg__abc.jpg')
  })
})

describe('extrairMensagensRecebidas com mídia', () => {
  it('captura o id e o mimetype de imagem e legenda como texto', () => {
    const payload: WhatsappWebhookPayload = {
      entry: [
        {
          changes: [
            {
              field: 'messages',
              value: {
                metadata: { phone_number_id: '111' },
                messages: [
                  {
                    id: 'wamid.img',
                    from: '5531999998888',
                    timestamp: '1700000000',
                    type: 'image',
                    image: { id: 'media-1', mime_type: 'image/jpeg', caption: 'Planta do imóvel' },
                  },
                ],
              },
            },
          ],
        },
      ],
    }

    const [lote] = extrairMensagensRecebidas(payload)
    expect(lote.mensagens[0]).toMatchObject({
      tipo: 'image',
      texto: 'Planta do imóvel',
      midiaId: 'media-1',
      midiaMimeType: 'image/jpeg',
    })
  })

  it('texto simples não tem mídia', () => {
    const payload: WhatsappWebhookPayload = {
      entry: [
        {
          changes: [
            {
              field: 'messages',
              value: {
                metadata: { phone_number_id: '111' },
                messages: [{ id: 'wamid.t', from: '5531', timestamp: '1', type: 'text', text: { body: 'oi' } }],
              },
            },
          ],
        },
      ],
    }
    const [lote] = extrairMensagensRecebidas(payload)
    expect(lote.mensagens[0]).toMatchObject({ texto: 'oi', midiaId: null, midiaMimeType: null })
  })
})
