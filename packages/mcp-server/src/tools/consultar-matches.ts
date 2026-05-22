import { z } from 'zod'
import { apiRequest } from '../client.js'

const schema = z.object({
  imovelId: z.string().optional().describe('Filtrar matches de um imóvel específico'),
  perfilId: z.string().optional().describe('Filtrar matches de um perfil específico'),
})

export const consultarMatchesTool = {
  name: 'consultar_matches',
  description:
    'Retorna os matches gerados entre imóveis e perfis de busca de clientes. Pode filtrar por imóvel ou por perfil.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      imovelId: { type: 'string', description: 'ID do imóvel' },
      perfilId: { type: 'string', description: 'ID do perfil de busca' },
    },
    required: [],
  },

  async execute(args: Record<string, unknown>) {
    const { imovelId, perfilId } = schema.parse(args)
    const params = new URLSearchParams()
    if (imovelId) params.set('imovelId', imovelId)
    if (perfilId) params.set('perfilId', perfilId)

    const query = params.toString() ? `?${params.toString()}` : ''
    const matches = await apiRequest('GET', `/matches${query}`)
    return { matches, total: (matches as any[]).length }
  },
}
