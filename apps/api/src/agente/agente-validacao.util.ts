// Validações da configuração do agente. Funções puras: a API só persiste o que passa aqui.
import { ProvedorIa, modeloValido } from './modelos-agente'

export const TEMPOS_RESPOSTA_SEGUNDOS = [0, 5, 10, 30, 60] as const

export const CAMPOS_OPCIONAIS_PERFIL = ['precoMin', 'precoMax', 'area', 'quartos', 'bairros'] as const
export type CampoOpcionalPerfil = (typeof CAMPOS_OPCIONAIS_PERFIL)[number]

export const LIMITES = {
  nome: 60,
  instrucoes: 6000,
  mensagemTransferencia: 500,
  maxMatchesMin: 1,
  maxMatchesMax: 20,
} as const

export type AtualizacaoAgente = {
  ativo?: boolean
  nome?: string
  instrucoes?: string
  provedor?: ProvedorIa
  modelo?: string
  tempoRespostaSegundos?: number
  transferirParaHumano?: boolean
  mensagemTransferencia?: string | null
  usarEmojis?: boolean
  assinarNome?: boolean
  restringirTemas?: boolean
  camposObrigatorios?: CampoOpcionalPerfil[]
  maxMatches?: number
}

export type ContextoValidacao = {
  // Provedores que têm chave salva para este tenant.
  provedoresComChave: ProvedorIa[]
  // Provedor que já está salvo; vale quando a atualização não envia um provedor novo.
  provedorAtual: ProvedorIa
}

export function validarAtualizacaoAgente(entrada: AtualizacaoAgente, ctx: ContextoValidacao): string[] {
  const erros: string[] = []

  if (entrada.nome !== undefined && (!entrada.nome.trim() || entrada.nome.length > LIMITES.nome)) {
    erros.push(`Nome deve ter de 1 a ${LIMITES.nome} caracteres.`)
  }

  if (entrada.instrucoes !== undefined && entrada.instrucoes.length > LIMITES.instrucoes) {
    erros.push(`Instruções podem ter no máximo ${LIMITES.instrucoes} caracteres.`)
  }

  if (entrada.mensagemTransferencia != null && entrada.mensagemTransferencia.length > LIMITES.mensagemTransferencia) {
    erros.push(`Mensagem de transferência pode ter no máximo ${LIMITES.mensagemTransferencia} caracteres.`)
  }

  if (entrada.tempoRespostaSegundos !== undefined && !(TEMPOS_RESPOSTA_SEGUNDOS as readonly number[]).includes(entrada.tempoRespostaSegundos)) {
    erros.push('Tempo de resposta deve ser 0, 5, 10, 30 ou 60 segundos.')
  }

  if (entrada.maxMatches !== undefined) {
    const n = entrada.maxMatches
    if (!Number.isInteger(n) || n < LIMITES.maxMatchesMin || n > LIMITES.maxMatchesMax) {
      erros.push(`Máximo de matches deve ser um número inteiro de ${LIMITES.maxMatchesMin} a ${LIMITES.maxMatchesMax}.`)
    }
  }

  if (entrada.camposObrigatorios !== undefined) {
    const invalidos = entrada.camposObrigatorios.filter((c) => !(CAMPOS_OPCIONAIS_PERFIL as readonly string[]).includes(c))
    if (invalidos.length > 0) erros.push(`Campos obrigatórios inválidos: ${invalidos.join(', ')}.`)
  }

  if (entrada.provedor !== undefined && !ctx.provedoresComChave.includes(entrada.provedor)) {
    erros.push(`Cadastre a chave do provedor ${entrada.provedor} antes de selecioná-lo.`)
  }

  const provedorEfetivo = entrada.provedor ?? ctx.provedorAtual
  if (entrada.modelo !== undefined && !modeloValido(provedorEfetivo, entrada.modelo)) {
    erros.push(`Modelo ${entrada.modelo} não pertence ao catálogo do provedor ${provedorEfetivo}.`)
  }

  if (entrada.ativo === true && !ctx.provedoresComChave.includes(provedorEfetivo)) {
    erros.push(`Cadastre a chave do provedor ${provedorEfetivo} antes de ligar o agente.`)
  }

  return erros
}
