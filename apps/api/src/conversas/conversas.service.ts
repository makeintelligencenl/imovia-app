import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { randomUUID } from 'crypto'
import { PrismaService } from '../prisma/prisma.service'
import { SupabaseStorageService } from '../storage/supabase-storage.service'
import { caminhoDaMidia, extensaoPorMimetype, tipoPorMimetype, validarMidia } from '../whatsapp/midia-whatsapp.util'
import { WhatsappClientService } from '../whatsapp/whatsapp-client.service'

const BUCKET_MIDIA = 'whatsapp-media'
const VALIDADE_URL_MIDIA_S = 300

// Janela do WhatsApp para texto livre: 24 horas a partir da última mensagem do cliente.
export const JANELA_TEXTO_LIVRE_MS = 24 * 60 * 60 * 1000
const LIMITE_TEXTO = 4096
const LIMITE_MENSAGENS = 200

// Compara telefones só pelos dígitos. Aceita número sem DDI quando o restante bate (mínimo de 10 dígitos).
export function mesmoTelefone(cadastrado: string | null | undefined, digitosConversa: string): boolean {
  if (!cadastrado) return false
  const d = cadastrado.replace(/\D/g, '')
  if (!d || !digitosConversa) return false
  if (d === digitosConversa) return true
  const curto = d.length < digitosConversa.length ? d : digitosConversa
  const longo = d.length < digitosConversa.length ? digitosConversa : d
  return curto.length >= 10 && longo.endsWith(curto)
}

export function dentroDaJanelaDeTextoLivre(ultimaMensagemClienteEm: Date | null, agora: Date): boolean {
  if (!ultimaMensagemClienteEm) return false
  return agora.getTime() - ultimaMensagemClienteEm.getTime() < JANELA_TEXTO_LIVRE_MS
}

@Injectable()
export class ConversasService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly whatsapp: WhatsappClientService,
    private readonly storage: SupabaseStorageService,
  ) {}

  listar(tenantId: string) {
    return this.prisma.conversaWhatsapp.findMany({
      where: { tenantId },
      orderBy: { atualizadaEm: 'desc' },
      take: 100,
    })
  }

  async contagens(tenantId: string) {
    const [naoLidas, esperando] = await Promise.all([
      this.prisma.conversaWhatsapp.aggregate({ where: { tenantId }, _sum: { unreadCount: true } }),
      this.prisma.conversaWhatsapp.count({
        where: { tenantId, resolvido: false, esperandoDesde: { not: null } },
      }),
    ])
    return { naoLidas: naoLidas._sum.unreadCount ?? 0, esperando }
  }

  // Confere que a conversa pertence ao tenant antes de qualquer ação.
  async obter(tenantId: string, id: string) {
    const conversa = await this.prisma.conversaWhatsapp.findFirst({ where: { id, tenantId } })
    if (!conversa) throw new NotFoundException('Conversa não encontrada.')
    return conversa
  }

  async mensagens(tenantId: string, id: string) {
    const conversa = await this.obter(tenantId, id)
    // Abrir a conversa marca as mensagens como lidas.
    if (conversa.unreadCount > 0) {
      await this.prisma.conversaWhatsapp.update({ where: { id: conversa.id }, data: { unreadCount: 0 } })
    }
    const mensagens = await this.prisma.mensagemWhatsapp.findMany({
      where: { conversaId: conversa.id },
      orderBy: { criadaEm: 'desc' },
      take: LIMITE_MENSAGENS,
    })
    // URL temporária para cada mídia: o bucket é privado.
    const comMidia = await Promise.all(
      mensagens.map(async (m) => ({
        ...m,
        midiaUrl: m.midiaStoragePath
          ? await this.storage.gerarUrlAssinada(BUCKET_MIDIA, m.midiaStoragePath, VALIDADE_URL_MIDIA_S)
          : null,
      })),
    )
    return comMidia.reverse()
  }

  // Envio de arquivo: valida tipo e limite, guarda no bucket e envia pela Meta.
  async enviarMidia(
    tenantId: string,
    userId: string,
    id: string,
    arquivo: { buffer: Buffer; mimetype: string; originalname: string; size: number },
    legenda?: string,
  ) {
    const erro = validarMidia(arquivo.mimetype, arquivo.size)
    if (erro) throw new BadRequestException(erro)
    const tipo = tipoPorMimetype(arquivo.mimetype)
    if (!tipo) throw new BadRequestException('Tipo de arquivo não aceito pelo WhatsApp.')

    const conversa = await this.obter(tenantId, id)
    if (!dentroDaJanelaDeTextoLivre(conversa.ultimaMensagemClienteEm, new Date())) {
      throw new BadRequestException(
        'A janela de 24 horas expirou. Envie um template aprovado para retomar a conversa.',
      )
    }

    // O arquivo é guardado antes do envio, com um nome aleatório, porque o id da Meta só existe depois.
    const identificador = randomUUID()
    const caminho = caminhoDaMidia(tenantId, conversa.id, identificador, extensaoPorMimetype(arquivo.mimetype))
    await this.storage.enviarArquivo(BUCKET_MIDIA, caminho, arquivo.buffer, arquivo.mimetype)

    const legendaLimpa = legenda?.trim() || null
    const waMessageId = await this.whatsapp.enviarMidia(
      tenantId,
      conversa.telefone,
      tipo,
      arquivo.buffer,
      arquivo.mimetype,
      legendaLimpa ?? undefined,
      arquivo.originalname,
    )

    await this.prisma.mensagemWhatsapp.create({
      data: {
        conversaId: conversa.id,
        waMessageId,
        direcao: 'SAIDA',
        remetente: 'HUMANO',
        tipo,
        texto: legendaLimpa,
        midiaStoragePath: caminho,
        criadaEm: new Date(),
        status: 'ENVIADA',
      },
    })

    await this.assumirSeNecessario(conversa, userId)
    return { enviada: true, waMessageId }
  }

  // Cartão do contato: cliente cadastrado com o mesmo telefone (só dígitos), ou null.
  async contato(tenantId: string, id: string) {
    const conversa = await this.obter(tenantId, id)
    return this.buscarClientePorTelefone(tenantId, conversa.telefone)
  }

  async criarClienteDaConversa(tenantId: string, userId: string, id: string, nome: string) {
    const conversa = await this.obter(tenantId, id)
    const existente = await this.buscarClientePorTelefone(tenantId, conversa.telefone)
    if (existente) throw new BadRequestException('Já existe um cliente com este telefone.')

    return this.prisma.cliente.create({
      data: { tenantId, nome: nome.trim(), telefone: conversa.telefone, whatsapp: conversa.telefone, corretorId: userId },
      select: { id: true, nome: true, email: true, telefone: true, whatsapp: true },
    })
  }

  private async buscarClientePorTelefone(tenantId: string, telefone: string) {
    const digitos = telefone.replace(/\D/g, '')
    const sufixo = digitos.slice(-8)
    const candidatos = await this.prisma.cliente.findMany({
      where: {
        tenantId,
        OR: [{ whatsapp: { contains: sufixo } }, { telefone: { contains: sufixo } }],
      },
      select: { id: true, nome: true, email: true, telefone: true, whatsapp: true },
      take: 50,
    })
    return (
      candidatos.find((c) => mesmoTelefone(c.whatsapp, digitos) || mesmoTelefone(c.telefone, digitos)) ?? null
    )
  }

  private async assumirSeNecessario(conversa: { id: string; humanTalk: boolean }, userId: string): Promise<void> {
    if (conversa.humanTalk) return
    await this.prisma.conversaWhatsapp.update({
      where: { id: conversa.id },
      data: { humanTalk: true, assumidoPorId: userId, esperandoDesde: null },
    })
  }

  async enviarTexto(tenantId: string, userId: string, id: string, texto: string) {
    const conteudo = texto.trim()
    if (!conteudo) throw new BadRequestException('A mensagem não pode ficar vazia.')
    if (conteudo.length > LIMITE_TEXTO) {
      throw new BadRequestException(`A mensagem pode ter no máximo ${LIMITE_TEXTO} caracteres.`)
    }

    const conversa = await this.obter(tenantId, id)
    if (!dentroDaJanelaDeTextoLivre(conversa.ultimaMensagemClienteEm, new Date())) {
      throw new BadRequestException(
        'A janela de 24 horas expirou. Envie um template aprovado para retomar a conversa.',
      )
    }

    const waMessageId = await this.whatsapp.enviarTexto(tenantId, conversa.telefone, conteudo)
    await this.prisma.mensagemWhatsapp.create({
      data: {
        conversaId: conversa.id,
        waMessageId,
        direcao: 'SAIDA',
        remetente: 'HUMANO',
        tipo: 'TEXTO',
        texto: conteudo,
        criadaEm: new Date(),
        status: 'ENVIADA',
      },
    })

    // Quem responde assume a conversa, e o agente deixa de responder nela (humanTalk).
    if (!conversa.humanTalk) {
      await this.prisma.conversaWhatsapp.update({
        where: { id: conversa.id },
        data: { humanTalk: true, assumidoPorId: userId, esperandoDesde: null },
      })
    }
    return { enviada: true, waMessageId }
  }

  async iniciarComTemplate(
    tenantId: string,
    userId: string,
    dados: { telefone: string; template: string; idioma: string; parametros?: string[] },
  ) {
    const telefone = dados.telefone.replace(/\D/g, '')
    const parametros = dados.parametros?.map((valor) => valor.trim()).filter((valor) => valor.length > 0)
    const waMessageId = await this.whatsapp.enviarTemplate(
      tenantId,
      telefone,
      dados.template,
      dados.idioma,
      parametros?.length ? parametros : undefined,
    )

    const conversa = await this.prisma.conversaWhatsapp.upsert({
      where: { tenantId_telefone: { tenantId, telefone } },
      create: { tenantId, telefone, humanTalk: true, assumidoPorId: userId },
      update: { humanTalk: true, assumidoPorId: userId, esperandoDesde: null, resolvido: false },
    })

    await this.prisma.mensagemWhatsapp.create({
      data: {
        conversaId: conversa.id,
        waMessageId,
        direcao: 'SAIDA',
        remetente: 'HUMANO',
        tipo: 'TEMPLATE',
        texto: `Template: ${dados.template}`,
        criadaEm: new Date(),
        status: 'ENVIADA',
      },
    })
    return { conversaId: conversa.id, waMessageId }
  }

  async assumir(tenantId: string, userId: string, id: string) {
    const conversa = await this.obter(tenantId, id)
    return this.prisma.conversaWhatsapp.update({
      where: { id: conversa.id },
      data: { humanTalk: true, assumidoPorId: userId, esperandoDesde: null },
    })
  }

  async resolver(tenantId: string, id: string) {
    const conversa = await this.obter(tenantId, id)
    // Resolvida: nem o agente nem uma pessoa atuam. Nova mensagem do cliente a reabre.
    return this.prisma.conversaWhatsapp.update({
      where: { id: conversa.id },
      data: { resolvido: true, humanTalk: false, assumidoPorId: null, esperandoDesde: null },
    })
  }
}
