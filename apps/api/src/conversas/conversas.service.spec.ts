import { BadRequestException, NotFoundException } from '@nestjs/common'
import { ConversasService, dentroDaJanelaDeTextoLivre, JANELA_TEXTO_LIVRE_MS, mesmoTelefone } from './conversas.service'
import { PrismaService } from '../prisma/prisma.service'
import { WhatsappClientService } from '../whatsapp/whatsapp-client.service'
import { SupabaseStorageService } from '../storage/supabase-storage.service'

describe('dentroDaJanelaDeTextoLivre', () => {
  const agora = new Date('2026-11-17T12:00:00Z')

  it('aceita quando a última mensagem do cliente está dentro de 24 horas', () => {
    const ultima = new Date(agora.getTime() - JANELA_TEXTO_LIVRE_MS + 60_000)
    expect(dentroDaJanelaDeTextoLivre(ultima, agora)).toBe(true)
  })

  it('recusa quando passou de 24 horas ou não há mensagem do cliente', () => {
    expect(dentroDaJanelaDeTextoLivre(new Date(agora.getTime() - JANELA_TEXTO_LIVRE_MS - 1), agora)).toBe(false)
    expect(dentroDaJanelaDeTextoLivre(null, agora)).toBe(false)
  })
})

function montar(conversa: Record<string, unknown> | null) {
  const prisma = {
    conversaWhatsapp: {
      findFirst: jest.fn().mockResolvedValue(conversa),
      update: jest.fn().mockResolvedValue({}),
    },
    mensagemWhatsapp: { create: jest.fn().mockResolvedValue({}) },
  }
  const whatsapp = { enviarTexto: jest.fn().mockResolvedValue('wamid.1') }
  const storage = { enviarArquivo: jest.fn(), gerarUrlAssinada: jest.fn() }
  const servico = new ConversasService(
    prisma as unknown as PrismaService,
    whatsapp as unknown as WhatsappClientService,
    storage as unknown as SupabaseStorageService,
  )
  return { servico, prisma, whatsapp }
}

describe('ConversasService.enviarTexto', () => {
  it('não envia quando a janela de 24 horas expirou', async () => {
    const antiga = new Date(Date.now() - JANELA_TEXTO_LIVRE_MS - 60_000)
    const { servico, whatsapp } = montar({
      id: 'c1',
      telefone: '5531999998888',
      humanTalk: false,
      ultimaMensagemClienteEm: antiga,
    })

    await expect(servico.enviarTexto('t1', 'u1', 'c1', 'Olá')).rejects.toBeInstanceOf(BadRequestException)
    expect(whatsapp.enviarTexto).not.toHaveBeenCalled()
  })

  it('envia dentro da janela, grava a saída e assume a conversa', async () => {
    const recente = new Date(Date.now() - 60_000)
    const { servico, whatsapp, prisma } = montar({
      id: 'c1',
      telefone: '5531999998888',
      humanTalk: false,
      ultimaMensagemClienteEm: recente,
    })

    await servico.enviarTexto('t1', 'u1', 'c1', '  Olá  ')

    expect(whatsapp.enviarTexto).toHaveBeenCalledWith('t1', '5531999998888', 'Olá')
    expect(prisma.mensagemWhatsapp.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ direcao: 'SAIDA', remetente: 'HUMANO', waMessageId: 'wamid.1' }) }),
    )
    expect(prisma.conversaWhatsapp.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ humanTalk: true, assumidoPorId: 'u1' }) }),
    )
  })

  it('recusa conversa de outro tenant ou inexistente', async () => {
    const { servico } = montar(null)
    await expect(servico.enviarTexto('t1', 'u1', 'x', 'Olá')).rejects.toBeInstanceOf(NotFoundException)
  })
})

describe('mesmoTelefone', () => {
  it('compara só os dígitos, ignorando máscara', () => {
    expect(mesmoTelefone('(31) 99999-8888', '5531999998888')).toBe(true)
    expect(mesmoTelefone('+55 (31) 99999-8888', '5531999998888')).toBe(true)
  })

  it('aceita cadastro sem DDI quando o restante bate', () => {
    expect(mesmoTelefone('31999998888', '5531999998888')).toBe(true)
  })

  it('não confunde telefones diferentes nem valores vazios', () => {
    expect(mesmoTelefone('31988887777', '5531999998888')).toBe(false)
    expect(mesmoTelefone(null, '5531999998888')).toBe(false)
    expect(mesmoTelefone('', '5531999998888')).toBe(false)
  })
})
