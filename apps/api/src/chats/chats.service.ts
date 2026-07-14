import { Injectable, Logger } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'

const GPTMAKER_BASE = 'https://api.gptmaker.ai'

@Injectable()
export class ChatsService {
  private readonly logger = new Logger(ChatsService.name)

  constructor(private readonly prisma: PrismaService) {}

  private get apiKey(): string {
    return process.env.GPTMAKER_API_KEY ?? ''
  }

  private get workspaceId(): string {
    return process.env.GPTMAKER_WORKSPACE_ID ?? ''
  }

  private async gptFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
    const url = `${GPTMAKER_BASE}${path}`
    const res = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        ...(options.headers ?? {}),
      },
    })
    if (!res.ok) {
      const body = await res.text()
      this.logger.error(`GPT Maker ${options.method ?? 'GET'} ${path} → ${res.status}: ${body}`)
      throw new Error(`GPT Maker error ${res.status}`)
    }
    return res.json() as Promise<T>
  }

  async listarChats(query?: { page?: string; pageSize?: string; agentId?: string; search?: string }) {
    const qs = new URLSearchParams()
    if (query?.page)     qs.set('page',     query.page)
    if (query?.pageSize) qs.set('pageSize', query.pageSize)
    if (query?.agentId)  qs.set('agentId',  query.agentId)
    if (query?.search)   qs.set('query',    query.search)
    return this.gptFetch<unknown>(`/v2/workspace/${this.workspaceId}/chats?${qs.toString()}`)
  }

  async listarMensagens(chatId: string, query?: { page?: string; pageSize?: string }) {
    const qs = new URLSearchParams()
    if (query?.page)     qs.set('page',     query.page)
    if (query?.pageSize) qs.set('pageSize', query.pageSize)
    return this.gptFetch<unknown>(`/v2/chat/${chatId}/messages?${qs.toString()}`)
  }

  async enviarMensagem(chatId: string, message: string) {
    return this.gptFetch<unknown>(`/v2/chat/${chatId}/send-message`, {
      method: 'POST',
      body: JSON.stringify({ message }),
    })
  }

  async clientNamesByChatId(tenantId: string): Promise<Record<string, string>> {
    const clientes = await this.prisma.cliente.findMany({
      where: { tenantId, ativo: true, NOT: { gptMakerChatId: null } },
      select: { gptMakerChatId: true, nome: true },
    })
    const map: Record<string, string> = {}
    for (const c of clientes) {
      if (c.gptMakerChatId) map[c.gptMakerChatId] = c.nome
    }
    return map
  }

  async assumirAtendimento(chatId: string) {
    return this.gptFetch<unknown>(`/v2/chat/${chatId}/start-human`, { method: 'PUT' })
  }

  async encerrarAtendimento(chatId: string) {
    return this.gptFetch<unknown>(`/v2/chat/${chatId}/stop-human`, { method: 'PUT' })
  }

  async infoMatch(tenantId: string, whatsappPhone: string, chatId?: string) {
    if (!whatsappPhone && !chatId) return null

    const digits = whatsappPhone?.replace(/\D/g, '') ?? ''

    const clientes = await this.prisma.cliente.findMany({
      where: { tenantId, ativo: true },
      include: {
        corretor: { select: { id: true, name: true } },
        perfis: {
          take: 1,
          orderBy: { updatedAt: 'desc' },
          include: {
            matches: {
              take: 1,
              orderBy: { updatedAt: 'desc' },
              include: {
                etapa:  { select: { nome: true } },
                imovel: {
                  select: {
                    id: true, titulo: true, preco: true, areaM2: true, quartos: true, vagas: true,
                    cidade: { select: { nome: true } },
                  },
                },
              },
            },
          },
        },
      },
    })

    // Busca por chatId (exato ou o chatId é sufixo do gptMakerChatId), depois por WhatsApp
    const cliente = clientes.find((c) => {
      if (!chatId) return false
      const saved = (c as any).gptMakerChatId as string | null
      return saved === chatId || (!!saved && saved.includes(chatId))
    })
      ?? clientes.find((c) => {
        if (!digits) return false
        const w = (c.whatsapp ?? '').replace(/\D/g, '')
        const t = (c.telefone ?? '').replace(/\D/g, '')
        return w.endsWith(digits.slice(-10)) || t.endsWith(digits.slice(-10))
      })

    if (!cliente) return null

    const perfil  = cliente.perfis[0]
    const match   = perfil?.matches[0]

    return {
      cliente: {
        id:        cliente.id,
        nome:      cliente.nome,
        email:     cliente.email,
        whatsapp:  cliente.whatsapp,
        corretor:  cliente.corretor,
      },
      perfil: perfil
        ? {
            id:          perfil.id,
            finalidade:  perfil.finalidade,
            precoMin:    perfil.precoMin,
            precoMax:    perfil.precoMax,
          }
        : null,
      match: match
        ? {
            id:        match.id,
            leadScore: match.leadScore,
            etapa:     match.etapa.nome,
            updatedAt: match.updatedAt,
            imovel:    match.imovel,
          }
        : null,
    }
  }
}
