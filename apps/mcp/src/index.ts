import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js'
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import express, { Request, Response } from 'express'
import { z } from 'zod'

const API_URL   = process.env.IMOVIA_API_URL   ?? 'http://localhost:3001/api/v1'
const BOT_KEY   = process.env.BOT_API_KEY       ?? ''
const TENANT_ID = process.env.IMOVIA_TENANT_ID ?? ''
const PORT      = Number(process.env.PORT)      || 3002

if (!BOT_KEY)   console.warn('[MCP] Aviso: BOT_API_KEY não definida')
if (!TENANT_ID) console.warn('[MCP] Aviso: IMOVIA_TENANT_ID não definida')

// ── Helper HTTP ───────────────────────────────────────────────────────────────

async function callApi(method: 'GET' | 'POST', path: string, body?: unknown): Promise<unknown> {
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', 'x-bot-api-key': BOT_KEY },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(`API erro ${res.status}: ${(data as { message?: string }).message ?? res.statusText}`)
  return data
}

// ── Registra ferramentas num McpServer ────────────────────────────────────────
// Extraído para permitir criar uma instância nova por conexão SSE/HTTP

function buildServer(): McpServer {
  const server = new McpServer({ name: 'imovia-mcp', version: '1.0.0' })

  server.tool(
    'listar_tipos',
    'Lista os tipos de imóvel disponíveis (ex: Apartamento, Casa). Use antes de cadastrar_perfil para obter IDs corretos.',
    {},
    async () => {
      const tipos = await callApi('GET', '/bot/tipos')
      return { content: [{ type: 'text' as const, text: JSON.stringify(tipos, null, 2) }] }
    },
  )

  server.tool(
    'cadastrar_perfil',
    'Cadastra o perfil de busca de um lead no ImovIA e dispara o matching automático com os imóveis disponíveis.',
    {
      clienteNome:     z.string().describe('Nome completo do cliente/lead'),
      clienteEmail:    z.string().email().describe('E-mail do cliente'),
      clienteWhatsapp: z.string().optional().describe('WhatsApp com DDD, ex: +5511999999999'),
      finalidade:      z.enum(['ALUGUEL', 'VENDA']).describe('O cliente quer alugar ou comprar?'),
      tiposIds:        z.array(z.string()).describe('IDs dos tipos de imóvel aceitos (use listar_tipos)'),
      precoMin:        z.number().min(0).describe('Orçamento mínimo em R$'),
      precoMax:        z.number().min(0).describe('Orçamento máximo em R$'),
      areaMin:         z.number().min(1).describe('Área mínima desejada em m²'),
      areaMax:         z.number().optional().describe('Área máxima em m² (opcional)'),
      quartosMin:      z.number().optional().describe('Número mínimo de quartos (opcional)'),
      cidades:         z.array(z.string()).describe('Cidades de interesse'),
      bairros:         z.array(z.string()).optional().describe('Bairros específicos (opcional)'),
    },
    async (params) => {
      const perfil = await callApi('POST', '/bot/perfil', { ...params, tenantId: TENANT_ID })
      const p = perfil as {
        perfilId: string; clienteNome: string; tipos: Array<{ nome: string }>
        finalidade: string; precoMin: number; precoMax: number; cidades: string[]
      }
      return {
        content: [{
          type: 'text' as const,
          text: `✅ Perfil cadastrado!\n\n**ID:** ${p.perfilId}\n**Cliente:** ${p.clienteNome}\n` +
                `**Finalidade:** ${p.finalidade}\n**Tipos:** ${p.tipos.map((t) => t.nome).join(', ')}\n` +
                `**Orçamento:** R$ ${p.precoMin.toLocaleString('pt-BR')} – R$ ${p.precoMax.toLocaleString('pt-BR')}\n` +
                `**Cidades:** ${p.cidades.join(', ')}\n\nUse buscar_imoveis com o ID do perfil para ver os resultados.`,
        }],
      }
    },
  )

  server.tool(
    'buscar_imoveis',
    'Retorna os imóveis compatíveis com o perfil de busca de um lead.',
    { perfilId: z.string().describe('ID do perfil retornado por cadastrar_perfil') },
    async ({ perfilId }) => {
      const result = await callApi('GET', `/bot/imoveis?perfilId=${perfilId}&tenantId=${TENANT_ID}`)
      const r = result as {
        total: number; mensagem?: string
        imoveis: Array<{ matchId: string; statusMatch: string; imovel: {
          titulo: string; tipo: string; finalidade: string; preco: number
          areaM2: number; quartos?: number; banheiros?: number; vagas?: number
          bairro: string; cidade: string; estado: string; descricao?: string
        }}>
      }
      if (r.total === 0) {
        return { content: [{ type: 'text' as const, text: `📭 ${r.mensagem ?? 'Nenhum imóvel compatível encontrado.'}` }] }
      }
      const lista = r.imoveis.map((m, i) => {
        const iv = m.imovel
        const preco = iv.preco.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
        const det = [iv.quartos && `${iv.quartos}q`, iv.banheiros && `${iv.banheiros}bh`, iv.vagas && `${iv.vagas}v`].filter(Boolean).join(' · ')
        return `**${i + 1}. ${iv.titulo}**\n   ${iv.tipo} | ${preco} | ${iv.areaM2}m²${det ? ` | ${det}` : ''}\n   ${iv.bairro}, ${iv.cidade}-${iv.estado}`
      }).join('\n\n')
      return { content: [{ type: 'text' as const, text: `🏠 **${r.total} imóvel(is) encontrado(s):**\n\n${lista}` }] }
    },
  )

  return server
}

// ── Express ───────────────────────────────────────────────────────────────────

const app = express()
app.use(express.json())

app.use((req: Request, res: Response, next: () => void) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-api-key, mcp-session-id')
  if (req.method === 'OPTIONS') { res.sendStatus(200); return }

  const accessKey = process.env.MCP_ACCESS_KEY
  if (accessKey) {
    const header = req.headers['x-api-key'] || (req.headers['authorization'] ?? '').replace('Bearer ', '')
    if (header !== accessKey) { res.status(401).json({ error: 'Não autorizado' }); return }
  }

  next()
})

// ── SSE (GET /sse + POST /messages) ──────────────────────────────────────────
// Cada conexão SSE recebe uma instância própria do servidor MCP

const sseTransports: Map<string, SSEServerTransport> = new Map()

app.get('/sse', async (req: Request, res: Response) => {
  // X-Accel-Buffering: no desativa buffer do nginx/Railway para SSE
  // Não chamar flushHeaders() — o SSEServerTransport chama writeHead() internamente
  res.setHeader('X-Accel-Buffering', 'no')

  // MCP spec exige URI completa no endpoint event (não caminho relativo)
  const proto = (req.headers['x-forwarded-proto'] as string) || 'https'
  const host  = (req.headers['x-forwarded-host'] as string) || req.headers.host || 'localhost'
  const messagesUrl = `${proto}://${host}/messages`

  const transport = new SSEServerTransport(messagesUrl, res)
  sseTransports.set(transport.sessionId, transport)

  // Keep-alive a cada 15s para evitar timeout do proxy
  const keepAlive = setInterval(() => {
    if (!res.writableEnded) res.write(': ping\n\n')
  }, 15000)

  res.on('close', () => {
    clearInterval(keepAlive)
    sseTransports.delete(transport.sessionId)
  })

  const server = buildServer()
  await server.connect(transport)
})

app.post('/messages', async (req: Request, res: Response) => {
  const sessionId = req.query.sessionId as string
  const transport = sseTransports.get(sessionId)
  if (!transport) {
    res.status(404).json({ error: 'Sessão não encontrada' })
    return
  }
  await transport.handlePostMessage(req, res)
})

// ── Streamable HTTP (POST /mcp) ───────────────────────────────────────────────
// Cada requisição recebe instância própria — modo stateless

app.post('/mcp', async (req: Request, res: Response) => {
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined })
  const server = buildServer()
  await server.connect(transport)
  await transport.handleRequest(req, res, req.body)
  res.on('close', () => transport.close())
})

app.get('/mcp', async (req: Request, res: Response) => {
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined })
  const server = buildServer()
  await server.connect(transport)
  await transport.handleRequest(req, res)
  res.on('close', () => transport.close())
})

// ── Health ────────────────────────────────────────────────────────────────────

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', server: 'imovia-mcp', version: '1.0.0' })
})

app.listen(PORT, () => {
  console.log(`🤖 ImovIA MCP rodando em http://localhost:${PORT}`)
  console.log(`   SSE:              GET  http://localhost:${PORT}/sse`)
  console.log(`   Streamable HTTP:  POST http://localhost:${PORT}/mcp`)
  console.log(`   API alvo:         ${API_URL}`)
  console.log(`   Tenant:           ${TENANT_ID || '(não configurado)'}`)
})
