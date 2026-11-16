import { MODELOS_POR_PROVEDOR, modeloPadrao, modeloValido } from './modelos-agente'

describe('catálogo de modelos do agente', () => {
  it('todo provedor tem ao menos um modelo rápido', () => {
    for (const provedor of Object.keys(MODELOS_POR_PROVEDOR) as Array<keyof typeof MODELOS_POR_PROVEDOR>) {
      expect(MODELOS_POR_PROVEDOR[provedor].some((m) => m.faixa === 'rapido')).toBe(true)
    }
  })

  it('o modelo padrão é o primeiro da faixa rápido', () => {
    expect(modeloPadrao('anthropic').id).toBe('claude-haiku-5-5')
    expect(modeloPadrao('openai').id).toBe('gpt-6-luna')
  })

  it('rejeita modelo que não está no catálogo do provedor', () => {
    expect(modeloValido('anthropic', 'claude-haiku-5-5')).toBe(true)
    expect(modeloValido('anthropic', 'gpt-6-luna')).toBe(false)
    expect(modeloValido('openai', 'modelo-inventado')).toBe(false)
  })
})
