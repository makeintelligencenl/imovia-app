import { mascarar } from './chaves-ia.service'

describe('mascarar', () => {
  it('mostra só os 4 últimos caracteres', () => {
    expect(mascarar('sk-abcdefgh1234')).toBe('••••1234')
  })

  it('não expõe o início da chave', () => {
    expect(mascarar('sk-segredo-muito-longo-WXYZ')).not.toContain('sk-')
  })
})
