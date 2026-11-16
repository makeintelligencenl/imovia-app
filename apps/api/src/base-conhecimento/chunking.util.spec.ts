import { TAMANHO_MAXIMO_TRECHO, dividirEmTrechos } from './chunking.util'

describe('dividirEmTrechos', () => {
  it('texto vazio não gera trechos', () => {
    expect(dividirEmTrechos('   \n\n  ')).toEqual([])
  })

  it('agrupa parágrafos curtos num mesmo trecho', () => {
    expect(dividirEmTrechos('Primeiro.\n\nSegundo.')).toEqual(['Primeiro.\n\nSegundo.'])
  })

  it('nenhum trecho passa do limite', () => {
    const texto = Array.from({ length: 50 }, (_, i) => `Parágrafo ${i} `.repeat(10)).join('\n\n')
    const trechos = dividirEmTrechos(texto)
    expect(trechos.length).toBeGreaterThan(1)
    for (const t of trechos) expect(t.length).toBeLessThanOrEqual(TAMANHO_MAXIMO_TRECHO)
  })

  it('corta um parágrafo maior que o limite sem perder conteúdo', () => {
    const longo = 'a'.repeat(TAMANHO_MAXIMO_TRECHO * 2 + 10)
    const trechos = dividirEmTrechos(longo)
    expect(trechos.join('')).toBe(longo)
    for (const t of trechos) expect(t.length).toBeLessThanOrEqual(TAMANHO_MAXIMO_TRECHO)
  })
})
