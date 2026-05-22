import { z } from 'zod'
import { apiRequest } from '../client.js'

const schema = z.object({
  imovelId: z.string(),
  status: z.enum(['DISPONIVEL', 'RESERVADO', 'ALUGADO', 'VENDIDO', 'INATIVO']),
})

export const atualizarStatusImovelTool = {
  name: 'atualizar_status_imovel',
  description:
    'Atualiza o status de um imóvel (ex: marcar como VENDIDO ou ALUGADO após fechar negócio).',
  inputSchema: {
    type: 'object' as const,
    properties: {
      imovelId: { type: 'string' },
      status: {
        type: 'string',
        enum: ['DISPONIVEL', 'RESERVADO', 'ALUGADO', 'VENDIDO', 'INATIVO'],
      },
    },
    required: ['imovelId', 'status'],
  },

  async execute(args: Record<string, unknown>) {
    const { imovelId, status } = schema.parse(args)
    const imovel = await apiRequest('PATCH', `/imoveis/${imovelId}/status`, { status })
    return { sucesso: true, imovel }
  },
}
