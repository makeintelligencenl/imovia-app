import {
  MARCADOR_TRANSFERIR,
  aplicarAssinatura,
  interpretarResposta,
  montarPromptSistema,
  OpcoesPrompt,
} from './agente-prompt.util'

const base: OpcoesPrompt = {
  nome: 'Ana',
  instrucoes: 'Atendente da imobiliária, tom educado.',
  transferirParaHumano: true,
  usarEmojis: false,
  restringirTemas: false,
  mensagemTransferencia: null,
  contexto: [],
}

describe('montarPromptSistema', () => {
  it('inclui regras fixas, instruções e nome do agente', () => {
    const prompt = montarPromptSistema(base)
    expect(prompt).toContain('Use somente as informações do contexto')
    expect(prompt).toContain('Seu nome é Ana')
    expect(prompt).toContain('Atendente da imobiliária, tom educado.')
  })

  it('com transferência ligada e mensagem em branco, pede ao modelo que gere a frase', () => {
    const prompt = montarPromptSistema({ ...base, mensagemTransferencia: '   ' })
    expect(prompt).toContain(MARCADOR_TRANSFERIR)
    expect(prompt).toContain('seguido de uma mensagem curta')
  })

  it('com transferência ligada e mensagem preenchida, o marcador vem sem texto extra', () => {
    const prompt = montarPromptSistema({ ...base, mensagemTransferencia: 'Um atendente vai te responder.' })
    expect(prompt).toContain(`responda exatamente ${MARCADOR_TRANSFERIR}, sem mais nada.`)
  })

  it('com transferência desligada, o modelo diz que não tem a informação', () => {
    const prompt = montarPromptSistema({ ...base, transferirParaHumano: false })
    expect(prompt).not.toContain(MARCADOR_TRANSFERIR)
    expect(prompt).toContain('diga com as suas palavras que não tem essa informação')
  })

  it('aplica as preferências de emojis e de restrição de temas', () => {
    const prompt = montarPromptSistema({ ...base, usarEmojis: true, restringirTemas: true })
    expect(prompt).toContain('Pode usar emojis com moderação.')
    expect(prompt).toContain('Fale somente sobre os assuntos')
  })

  it('monta os trechos da base com título', () => {
    const prompt = montarPromptSistema({
      ...base,
      contexto: [{ titulo: 'Financiamento', conteudo: 'Aceitamos FGTS.' }],
    })
    expect(prompt).toContain('### Financiamento\nAceitamos FGTS.')
  })

  it('sem trechos, indica contexto vazio', () => {
    expect(montarPromptSistema(base)).toContain('(vazio)')
  })
})

describe('interpretarResposta', () => {
  it('texto comum vira resposta', () => {
    expect(interpretarResposta('  Olá, tudo bem?  ', true)).toEqual({ tipo: 'resposta', texto: 'Olá, tudo bem?' })
  })

  it('marcador sozinho vira transferência sem texto', () => {
    expect(interpretarResposta(MARCADOR_TRANSFERIR, true)).toEqual({ tipo: 'transferencia', texto: null })
  })

  it('marcador seguido de texto vira transferência com a frase gerada', () => {
    expect(interpretarResposta(`${MARCADOR_TRANSFERIR} Um atendente vai continuar com você.`, true)).toEqual({
      tipo: 'transferencia',
      texto: 'Um atendente vai continuar com você.',
    })
  })

  it('com transferência desligada, o marcador nunca chega ao cliente', () => {
    const r = interpretarResposta(`${MARCADOR_TRANSFERIR} Não tenho essa informação.`, false)
    expect(r.tipo).toBe('resposta')
    expect(r.texto).not.toContain(MARCADOR_TRANSFERIR)
    expect(r.texto).toBe('Não tenho essa informação.')
  })
})

describe('aplicarAssinatura', () => {
  it('prefixa o nome quando a assinatura está ligada', () => {
    expect(aplicarAssinatura('Bom dia!', 'Ana', true)).toBe('Ana: Bom dia!')
  })

  it('não altera o texto quando a assinatura está desligada', () => {
    expect(aplicarAssinatura('Bom dia!', 'Ana', false)).toBe('Bom dia!')
  })
})
