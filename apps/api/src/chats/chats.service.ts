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

  // Cada imobiliária tem seu próprio agente no GPT Maker — o workspace pode
  // ser compartilhado (fallback no env) ou próprio, se um dia migrarem pra
  // workspaces separados por tenant.
  private async resolveGptMakerConfig(tenantId: string): Promise<{ workspaceId: string; agentId: string | null }> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { gptMakerWorkspaceId: true, gptMakerAgentId: true },
    })
    return {
      workspaceId: tenant?.gptMakerWorkspaceId || process.env.GPTMAKER_WORKSPACE_ID || '',
      agentId: tenant?.gptMakerAgentId ?? null,
    }
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

  async listarChats(tenantId: string, query?: { page?: string; pageSize?: string; search?: string; finished?: string }) {
    const { workspaceId, agentId } = await this.resolveGptMakerConfig(tenantId)

    // Sem agente configurado para o tenant, não há como filtrar com segurança
    // no GPT Maker — retorna vazio em vez de arriscar vazar chats de outro tenant.
    if (!agentId) {
      this.logger.warn(`Tenant ${tenantId} sem gptMakerAgentId configurado — listagem de chats vazia.`)
      return []
    }

    const qs = new URLSearchParams()
    if (query?.page)     qs.set('page',     query.page)
    if (query?.pageSize) qs.set('pageSize', query.pageSize)
    qs.set('agentId', agentId) // sempre o agente do próprio tenant — nunca vindo do cliente
    if (query?.search)   qs.set('query',    query.search)
    if (query?.finished) qs.set('finished', query.finished)
    return this.gptFetch<unknown>(`/v2/workspace/${workspaceId}/chats?${qs.toString()}`)
  }

  // Não faz sentido checar posse via Cliente nas ações abaixo: o chatId só
  // chega até aqui porque já veio da listagem (listarChats), que já é
  // filtrada pelo agentId do tenant — e leads recém-chegados podem não ter
  // Cliente vinculado ainda. A própria API do GPT Maker não oferece um jeito
  // barato de reverificar a posse de um chat isolado (sem agentId/workspaceId
  // na resposta de mensagens, e sem endpoint de "buscar chat por id").
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

  // Alias — ambas as rotas (/end e /resolve) fazem a mesma operação no GPT Maker
  resolverChat(chatId: string) {
    return this.encerrarAtendimento(chatId)
  }

  async editarMensagem(chatId: string, messageId: string, message: string) {
    return this.gptFetch<unknown>(`/v2/chat/${chatId}/message/${messageId}`, {
      method: 'PUT',
      body: JSON.stringify({ message }),
    })
  }

  async excluirMensagem(chatId: string, messageId: string) {
    return this.gptFetch<unknown>(`/v2/chat/${chatId}/message/${messageId}`, { method: 'DELETE' })
  }

  async infoMatch(tenantId: string, whatsappPhone: string, chatId?: string) {
    if (!whatsappPhone && !chatId) return null

    const digits = whatsappPhone?.replace(/\D/g, '') ?? ''

    // Campos necessários para montar o retorno — reutilizados nas duas queries
    const clienteInclude = {
      corretor: { select: { id: true, name: true } },
      perfis: {
        take: 1,
        orderBy: { updatedAt: 'desc' } as const,
        include: {
          matches: {
            take: 1,
            orderBy: { updatedAt: 'desc' } as const,
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
    }

    // 1. Lookup por chatId usando índice em gptMakerChatId (O(log n))
    const clientePorChat = chatId
      ? await this.prisma.cliente.findFirst({
          where:   { tenantId, ativo: true, gptMakerChatId: { contains: chatId } },
          include: clienteInclude,
        })
      : null

    // 2. Fallback por número de telefone — procura nos últimos 10 dígitos (O(log n) via índice de phone, se existir)
    const cliente = clientePorChat ?? (digits
      ? await this.prisma.cliente.findFirst({
          where: {
            tenantId,
            ativo: true,
            OR: [
              { whatsapp: { contains: digits.slice(-10) } },
              { telefone: { contains: digits.slice(-10) } },
            ],
          },
          include: clienteInclude,
        })
      : null)

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
