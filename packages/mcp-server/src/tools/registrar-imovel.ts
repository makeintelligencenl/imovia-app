import { z } from 'zod'
import { apiRequest } from '../client.js'

const schema = z.object({
  titulo: z.string().describe('Título do imóvel'),
  tipo: z.enum(['APARTAMENTO', 'CASA', 'COMERCIAL', 'TERRENO', 'RURAL']),
  finalidade: z.enum(['ALUGUEL', 'VENDA']),
  preco: z.number().positive().describe('Preço em reais'),
  areaM2: z.number().positive().describe('Área em metros quadrados'),
  quartos: z.number().int().optional(),
  banheiros: z.number().int().optional(),
  vagas: z.number().int().optional(),
  bairro: z.string(),
  cidade: z.string(),
  estado: z.string().length(2).describe('UF, ex: SP'),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  descricao: z.string().optional(),
})

export const registrarImovelTool = {
  name: 'registrar_imovel',
  description:
    'Registra um novo imóvel na plataforma e dispara automaticamente o motor de matching com os perfis de busca dos clientes.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      titulo: { type: 'string' },
      tipo: { type: 'string', enum: ['APARTAMENTO', 'CASA', 'COMERCIAL', 'TERRENO', 'RURAL'] },
      finalidade: { type: 'string', enum: ['ALUGUEL', 'VENDA'] },
      preco: { type: 'number' },
      areaM2: { type: 'number' },
      quartos: { type: 'number' },
      banheiros: { type: 'number' },
      vagas: { type: 'number' },
      bairro: { type: 'string' },
      cidade: { type: 'string' },
      estado: { type: 'string' },
      latitude: { type: 'number' },
      longitude: { type: 'number' },
      descricao: { type: 'string' },
    },
    required: ['titulo', 'tipo', 'finalidade', 'preco', 'areaM2', 'bairro', 'cidade', 'estado'],
  },

  async execute(args: Record<string, unknown>) {
    const data = schema.parse(args)
    const imovel = await apiRequest('POST', '/imoveis', data)
    return {
      sucesso: true,
      mensagem: 'Imóvel registrado. Motor de matching disparado em background.',
      imovel,
    }
  },
}
