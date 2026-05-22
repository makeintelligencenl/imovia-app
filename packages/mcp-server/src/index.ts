import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js'
import { registrarImovelTool } from './tools/registrar-imovel.js'
import { listarPerfisTool } from './tools/listar-perfis.js'
import { consultarMatchesTool } from './tools/consultar-matches.js'
import { atualizarStatusImovelTool } from './tools/atualizar-status-imovel.js'

const server = new Server(
  { name: 'corretor-imoveis-mcp', version: '0.1.0' },
  { capabilities: { tools: {} } },
)

const tools = [
  registrarImovelTool,
  listarPerfisTool,
  consultarMatchesTool,
  atualizarStatusImovelTool,
]

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: tools.map((t) => ({ name: t.name, description: t.description, inputSchema: t.inputSchema })),
}))

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const tool = tools.find((t) => t.name === request.params.name)

  if (!tool) {
    return {
      content: [{ type: 'text', text: `Tool desconhecida: ${request.params.name}` }],
      isError: true,
    }
  }

  try {
    const result = await tool.execute(request.params.arguments as Record<string, unknown>)
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
  } catch (error: any) {
    return {
      content: [{ type: 'text', text: `Erro: ${error.message}` }],
      isError: true,
    }
  }
})

async function main() {
  const transport = new StdioServerTransport()
  await server.connect(transport)
  console.error('Corretor Imóveis MCP Server iniciado')
}

main()
