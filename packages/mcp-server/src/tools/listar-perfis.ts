import { apiRequest } from '../client.js'

export const listarPerfisTool = {
  name: 'listar_perfis',
  description:
    'Lista os perfis de busca ativos dos clientes da imobiliária. Útil para entender a demanda atual antes de cadastrar imóveis.',
  inputSchema: {
    type: 'object' as const,
    properties: {},
    required: [],
  },

  async execute(_args: Record<string, unknown>) {
    const perfis = await apiRequest('GET', '/perfis')
    return { perfis, total: (perfis as any[]).length }
  },
}
