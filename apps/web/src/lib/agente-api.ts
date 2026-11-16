// Chamadas das telas do agente. Usa o cliente api do projeto (com cache de GET invalidado nas escritas).
import { api, invalidateCache } from './api'

export type ProvedorIa = 'anthropic' | 'openai'

export type ModeloCatalogo = { id: string; rotulo: string; faixa: 'rapido' | 'equilibrado' | 'capaz' }

export type ConfiguracaoAgente = {
  id: string
  ativo: boolean
  nome: string
  instrucoes: string
  provedor: ProvedorIa
  modelo: string
  tempoRespostaSegundos: number
  transferirParaHumano: boolean
  mensagemTransferencia: string | null
  usarEmojis: boolean
  assinarNome: boolean
  restringirTemas: boolean
  camposObrigatorios: string[]
  maxMatches: number
  itemIds: string[]
  provedoresDisponiveis: ProvedorIa[]
  catalogoModelos: Record<ProvedorIa, ModeloCatalogo[]>
  ultimaFalha: { em: string; mensagem: string | null } | null
}

export type AtualizacaoAgente = Partial<
  Omit<ConfiguracaoAgente, 'id' | 'itemIds' | 'provedoresDisponiveis' | 'catalogoModelos' | 'ultimaFalha'>
>

export type ChaveIa = { provedor: ProvedorIa; configurada: boolean; apiKeyMascarada: string | null }

export type ItemBase = {
  id: string
  titulo: string
  tipo: string
  conteudo: string
  criadoEm: string
  atualizadoEm: string
}

export type MensagemTeste = { papel: 'cliente' | 'agente'; texto: string }

export const CAMPOS_OPCIONAIS = [
  { id: 'area', rotulo: 'Área (m²)' },
  { id: 'quartos', rotulo: 'Quartos' },
  { id: 'bairros', rotulo: 'Bairros' },
] as const

export function buscarAgente(): Promise<ConfiguracaoAgente> {
  return api.get<ConfiguracaoAgente>('/agente')
}

export async function salvarAgente(dados: AtualizacaoAgente, itemIds: string[]): Promise<ConfiguracaoAgente> {
  await api.patch<ConfiguracaoAgente>('/agente', dados)
  await api.put<{ itemIds: string[] }>('/agente/itens', { itemIds })
  invalidateCache('/agente')
  return buscarAgente()
}

export function testarAgente(mensagens: MensagemTeste[]): Promise<{ tipo: 'resposta' | 'transferencia'; texto: string | null }> {
  return api.post('/agente/testar', { mensagens })
}

export function listarChaves(): Promise<ChaveIa[]> {
  return api.get<ChaveIa[]>('/chaves-ia')
}

export async function salvarChave(provedor: ProvedorIa, apiKey: string): Promise<ChaveIa> {
  const salva = await api.patch<ChaveIa>(`/chaves-ia/${provedor}`, { apiKey })
  invalidateCache('/chaves-ia')
  return salva
}

export function listarItensBase(): Promise<ItemBase[]> {
  return api.get<ItemBase[]>('/base-conhecimento')
}

export async function criarItemBase(dados: { titulo: string; conteudo: string }): Promise<ItemBase> {
  const criado = await api.post<ItemBase>('/base-conhecimento', dados)
  invalidateCache('/base-conhecimento')
  return criado
}

export async function atualizarItemBase(id: string, dados: { titulo?: string; conteudo?: string }): Promise<ItemBase> {
  const atualizado = await api.patch<ItemBase>(`/base-conhecimento/${id}`, dados)
  invalidateCache('/base-conhecimento')
  return atualizado
}

export async function removerItemBase(id: string): Promise<void> {
  await api.delete(`/base-conhecimento/${id}`)
  invalidateCache('/base-conhecimento')
}
