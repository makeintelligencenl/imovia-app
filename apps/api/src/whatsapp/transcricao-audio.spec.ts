import { ChavesIaService } from '../agente/chaves-ia.service'
import { TranscricaoAudioService } from './transcricao-audio.service'

describe('TranscricaoAudioService', () => {
  const fetchOriginal = global.fetch

  afterEach(() => {
    global.fetch = fetchOriginal
    jest.restoreAllMocks()
  })

  it('não chama a OpenAI quando a imobiliária não tem chave', async () => {
    const chaves = { obterChave: jest.fn().mockResolvedValue(null) } as unknown as ChavesIaService
    const fetchMock = jest.fn()
    global.fetch = fetchMock as unknown as typeof fetch

    const texto = await new TranscricaoAudioService(chaves).transcrever('t1', Buffer.from('audio'), 'audio/ogg')

    expect(texto).toBeNull()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('envia o áudio com a chave da imobiliária e devolve o texto', async () => {
    const chaves = { obterChave: jest.fn().mockResolvedValue('sk-teste') } as unknown as ChavesIaService
    const fetchMock = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ text: '  Quero visitar amanhã  ' }) })
    global.fetch = fetchMock as unknown as typeof fetch

    const texto = await new TranscricaoAudioService(chaves).transcrever('t1', Buffer.from('audio'), 'audio/ogg')

    expect(texto).toBe('Quero visitar amanhã')
    expect(chaves.obterChave).toHaveBeenCalledWith('t1', 'openai')
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('https://api.openai.com/v1/audio/transcriptions')
    expect((init as RequestInit).headers).toEqual({ Authorization: 'Bearer sk-teste' })
  })

  it('lança erro quando a OpenAI recusa a transcrição', async () => {
    const chaves = { obterChave: jest.fn().mockResolvedValue('sk-teste') } as unknown as ChavesIaService
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 401 }) as unknown as typeof fetch

    await expect(new TranscricaoAudioService(chaves).transcrever('t1', Buffer.from('a'), 'audio/ogg')).rejects.toThrow(
      'status 401',
    )
  })
})
