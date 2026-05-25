import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js'
import express, { Request, Response } from 'express'
import { z } from 'zod'

// ──────────────────────────────────────────────────────
// Configuração via variáveis de ambiente
// ──────────────────────────────────────────────────────
const API_URL    = process.env.IMOVIA_API_URL    ?? 'http://localhost:3001/api/v1'
const BOT_KEY    = process.env.BOT_API_KEY        ?? ''
const TENANT_ID  = process.env.IMOVIA_TENANT_ID  ?? ''
const PORT       = Number(process.env.PORT)       || 3002

if (!BOT_KEY)   console.warn('[MCP] Aviso: BOT_API_KEY não definida')
if (!TENANT_ID) console.warn('[MCP] Aviso: IMOVIA_TENANT_ID não definida')

// ──────────────────────────────────────────────────────
// Helper HTTP para chamar a API do ImovIA
// ──────────────────────────────────────────────────────
async function callApi(
  method: 'GET' | 'POST',
  path: string,
  body?: unknown,
): Promise<unknown> {
  const url = `${API_URL}${path}`
  const res = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'x-bot-api-key': BOT_KEY,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })

  const data = await res.json()

  if (!res.ok) {
    const msg = (data as { message?: string }).message ?? res.statusText
    throw new Error(`API erro ${res.status}: ${msg}`)
  }

  return data
}

// ──────────────────────────────────────────────────────
// Servidor MCP
// ──────────────────────────────────────────────────────
const server = new McpServer({
  name: 'imovia-mcp',
  version: '1.0.0',
})

// ──────────────────────────────────────────────────────
// Ferramenta 1: listar_tipos
// Use ANTES de cadastrar_perfil para obter os IDs corretos
// ──────────────────────────────────────────────────────
server.tool(
  'listar_tipos',
  'Lista os tipos de imóvel disponíveis no sistema (ex: Apartamento, Casa, Sala Comercial). ' +
    'Use esta ferramenta para obter o ID correto antes de cadastrar um perfil de busca.',
  {},
  async () => {
    const tipos = await callApi('GET', '/bot/tipos')
    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(tipos, null, 2),
        },
      ],
    }
  },
)

// ──────────────────────────────────────────────────────
// Ferramenta 2: cadastrar_perfil
// Cria o perfil do lead e dispara o matching automático
// ──────────────────────────────────────────────────────
server.tool(
  'cadastrar_perfil',
  'Cadastra o perfil de busca de um lead no ImovIA. ' +
    'Assim que o perfil é criado, o sistema dispara automaticamente o matching com os imóveis ' +
    'disponíveis no portfólio da imobiliária. ' +
    'Antes de chamar esta ferramenta, use listar_tipos para obter os IDs corretos dos tipos de imóvel.',
  {
    clienteNome:      z.string().describe('Nome completo do cliente/lead'),
    clienteEmail:     z.string().email().describe('E-mail do cliente'),
    clienteWhatsapp:  z.string().optional().describe('WhatsApp do cliente com DDD, ex: +5511999999999'),
    finalidade:       z.enum(['ALUGUEL', 'VENDA']).describe('O cliente quer alugar ou comprar?'),
    tiposIds:         z.array(z.string()).describe('IDs dos tipos de imóvel aceitos (use listar_tipos)'),
    precoMin:         z.number().min(0).describe('Orçamento mínimo em R$'),
    precoMax:         z.number().min(0).describe('Orçamento máximo em R$'),
    areaMin:          z.number().min(1).describe('Área mínima desejada em m²'),
    areaMax:          z.number().optional().describe('Área máxima desejada em m² (opcional)'),
    quartosMin:       z.number().optional().describe('Número mínimo de quartos (opcional)'),
    cidades:          z.array(z.string()).describe('Cidades de interesse, ex: ["São Paulo", "Guarulhos"]'),
    bairros:          z.array(z.string()).optional().describe('Bairros específicos de interesse (opcional)'),
  },
  async (params) => {
    const perfil = await callApi('POST', '/bot/perfil', {
      ...params,
      tenantId: TENANT_ID,
    })

    const p = perfil as {
      perfilId: string
      clienteNome: string
      tipos: Array<{ nome: string }>
      finalidade: string
      precoMin: number
      precoMax: number
      cidades: string[]
    }

    return {
      content: [
        {
          type: 'text' as const,
          text:
            `✅ Perfil cadastrado com sucesso!\n\n` +
            `**ID do perfil:** ${p.perfilId}\n` +
            `**Cliente:** ${p.clienteNome}\n` +
            `**Finalidade:** ${p.finalidade}\n` +
            `**Tipos:** ${p.tipos.map((t) => t.nome).join(', ')}\n` +
            `**Orçamento:** R$ ${p.precoMin.toLocaleString('pt-BR')} – R$ ${p.precoMax.toLocaleString('pt-BR')}\n` +
            `**Cidades:** ${p.cidades.join(', ')}\n\n` +
            `O sistema já iniciou a busca por imóveis compatíveis. ` +
            `Use buscar_imoveis com o ID do perfil para ver os resultados.`,
        },
      ],
    }
  },
)

// ──────────────────────────────────────────────────────
// Ferramenta 3: buscar_imoveis
// Retorna os imóveis que já fizeram match com o perfil
// ──────────────────────────────────────────────────────
server.tool(
  'buscar_imoveis',
  'Busca os imóveis disponíveis que são compatíveis com o perfil de busca de um lead. ' +
    'Retorna a lista de imóveis com detalhes para apresentar ao cliente.',
  {
    perfilId: z.string().describe('ID do perfil retornado por cadastrar_perfil'),
  },
  async ({ perfilId }) => {
    const result = await callApi(
      'GET',
      `/bot/imoveis?perfilId=${perfilId}&tenantId=${TENANT_ID}`,
    )

    const r = result as {
      total: number
      mensagem?: string
      imoveis: Array<{
        matchId: string
        statusMatch: string
        imovel: {
          titulo: string
          tipo: string
          finalidade: string
          preco: number
          areaM2: number
          quartos?: number
          banheiros?: number
          vagas?: number
          bairro: string
          cidade: string
          estado: string
          descricao?: string
        }
      }>
    }

    if (r.total === 0) {
      return {
        content: [
          {
            type: 'text' as const,
            text: `📭 ${r.mensagem ?? 'Nenhum imóvel compatível encontrado no momento.'}`,
          },
        ],
      }
    }

    const lista = r.imoveis
      .map((m, i) => {
        const iv = m.imovel
        const preco = iv.preco.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
        const detalhes = [
          iv.quartos  ? `${iv.quartos} quarto(s)` : null,
          iv.banheiros ? `${iv.banheiros} banheiro(s)` : null,
          iv.vagas     ? `${iv.vagas} vaga(s)` : null,
        ]
          .filter(Boolean)
          .join(' · ')

        return (
          `**${i + 1}. ${iv.titulo}**\n` +
          `   Tipo: ${iv.tipo} | ${iv.finalidade}\n` +
          `   Preço: ${preco} | Área: ${iv.areaM2} m²\n` +
          (detalhes ? `   ${detalhes}\n` : '') +
          `   Localização: ${iv.bairro}, ${iv.cidade} - ${iv.estado}\n` +
          (iv.descricao ? `   ${iv.descricao}\n` : '')
        )
      })
      .join('\n')

    return {
      content: [
        {
          type: 'text' as const,
          text: `🏠 **${r.total} imóvel(is) compatível(is) encontrado(s):**\n\n${lista}`,
        },
      ],
    }
  },
)

// ──────────────────────────────────────────────────────
// Servidor Express com transporte SSE
// ──────────────────────────────────────────────────────
const app = express()
app.use(express.json())

// CORS — permite conexões de qualquer origem (necessário para GPT Maker)
app.use((_req: Request, res: Response, next: () => void) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-api-key')
  next()
})

const transports: Map<string, SSEServerTransport> = new Map()

// Middleware de autenticação por header
const MCP_ACCESS_KEY = process.env.MCP_ACCESS_KEY ?? ''

function authMiddleware(req: Request, res: Response, next: () => void) {
  // Se não houver chave configurada, permite tudo (modo dev)
  if (!MCP_ACCESS_KEY) return next()

  const key =
    req.headers['x-api-key'] ??
    req.headers['authorization']?.replace('Bearer ', '')

  if (key !== MCP_ACCESS_KEY) {
    res.status(401).json({ error: 'Não autorizado' })
    return
  }

  next()
}

// Endpoint SSE — o GPT Maker conecta aqui
app.get('/sse', authMiddleware, async (_req: Request, res: Response) => {
  const transport = new SSEServerTransport('/messages', res)
  transports.set(transport.sessionId, transport)

  res.on('close', () => {
    transports.delete(transport.sessionId)
  })

  await server.connect(transport)
})

// Endpoint de mensagens — recebe as chamadas do GPT Maker
app.post('/messages', authMiddleware, async (req: Request, res: Response) => {
  const sessionId = req.query.sessionId as string
  const transport = transports.get(sessionId)

  if (!transport) {
    res.status(404).json({ error: 'Sessão não encontrada' })
    return
  }

  await transport.handlePostMessage(req, res)
})

// Health check
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', server: 'imovia-mcp', version: '1.0.0' })
})

app.listen(PORT, () => {
  console.log(`🤖 ImovIA MCP Server rodando em http://localhost:${PORT}`)
  console.log(`   SSE endpoint:  http://localhost:${PORT}/sse`)
  console.log(`   API alvo:      ${API_URL}`)
  console.log(`   Tenant:        ${TENANT_ID || '(não configurado)'}`)
})
