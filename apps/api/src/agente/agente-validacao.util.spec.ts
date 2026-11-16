import { ContextoValidacao, LIMITES, validarAtualizacaoAgente } from './agente-validacao.util'

const semChaves: ContextoValidacao = { provedoresComChave: [] }
const comOpenAi: ContextoValidacao = { provedoresComChave: ['openai'] }

describe('validarAtualizacaoAgente', () => {
  it('aceita uma atualização válida', () => {
    expect(
      validarAtualizacaoAgente(
        { nome: 'Ana', tempoRespostaSegundos: 5, maxMatches: 5, camposObrigatorios: ['quartos'] },
        semChaves,
      ),
    ).toEqual([])
  })

  it('rejeita tempo de resposta fora das opções', () => {
    expect(validarAtualizacaoAgente({ tempoRespostaSegundos: 7 }, semChaves)).toHaveLength(1)
  })

  it('rejeita instruções e mensagem de transferência acima do limite', () => {
    expect(validarAtualizacaoAgente({ instrucoes: 'x'.repeat(LIMITES.instrucoes + 1) }, semChaves)).toHaveLength(1)
    expect(
      validarAtualizacaoAgente({ mensagemTransferencia: 'x'.repeat(LIMITES.mensagemTransferencia + 1) }, semChaves),
    ).toHaveLength(1)
  })

  it('rejeita nome vazio ou longo demais', () => {
    expect(validarAtualizacaoAgente({ nome: '   ' }, semChaves)).toHaveLength(1)
    expect(validarAtualizacaoAgente({ nome: 'x'.repeat(LIMITES.nome + 1) }, semChaves)).toHaveLength(1)
  })

  it('limita o máximo de matches entre 1 e 20', () => {
    expect(validarAtualizacaoAgente({ maxMatches: 0 }, semChaves)).toHaveLength(1)
    expect(validarAtualizacaoAgente({ maxMatches: 21 }, semChaves)).toHaveLength(1)
    expect(validarAtualizacaoAgente({ maxMatches: 2.5 }, semChaves)).toHaveLength(1)
    expect(validarAtualizacaoAgente({ maxMatches: 20 }, semChaves)).toEqual([])
  })

  it('rejeita campos obrigatórios que não existem no perfil', () => {
    const erros = validarAtualizacaoAgente({ camposObrigatorios: ['cpf' as never] }, semChaves)
    expect(erros).toHaveLength(1)
  })

  it('não deixa escolher um provedor sem chave salva', () => {
    expect(validarAtualizacaoAgente({ provedor: 'anthropic' }, comOpenAi)).toHaveLength(1)
    expect(validarAtualizacaoAgente({ provedor: 'openai' }, comOpenAi)).toEqual([])
  })

  it('rejeita modelo que não pertence ao provedor informado', () => {
    expect(
      validarAtualizacaoAgente({ provedor: 'openai', modelo: 'claude-haiku-5-5' }, comOpenAi),
    ).toHaveLength(1)
    expect(validarAtualizacaoAgente({ provedor: 'openai', modelo: 'gpt-6-luna' }, comOpenAi)).toEqual([])
  })
})
