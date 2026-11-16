// Catálogo curado de modelos de geração por provedor. A imobiliária só escolhe entre estes.
// Revisar sempre que um provedor lançar ou aposentar modelos (IDs conferidos na documentação oficial).

export type ProvedorIa = 'anthropic' | 'openai'

export type FaixaModelo = 'rapido' | 'equilibrado' | 'capaz'

export type ModeloAgente = {
  id: string
  rotulo: string
  faixa: FaixaModelo
}

export const MODELOS_POR_PROVEDOR: Record<ProvedorIa, ModeloAgente[]> = {
  anthropic: [
    { id: 'claude-haiku-5-5', rotulo: 'Claude Haiku 5.5', faixa: 'rapido' },
    { id: 'claude-sonnet-5-5', rotulo: 'Claude Sonnet 5.5', faixa: 'equilibrado' },
    { id: 'claude-opus-5-5', rotulo: 'Claude Opus 5.5', faixa: 'capaz' },
  ],
  openai: [
    { id: 'gpt-6-luna', rotulo: 'GPT-6 Luna', faixa: 'rapido' },
    { id: 'gpt-6.1-terra', rotulo: 'GPT-6.1 Terra', faixa: 'equilibrado' },
    { id: 'gpt-6.1-sol', rotulo: 'GPT-6.1 Sol', faixa: 'capaz' },
    { id: 'gpt-6-astra', rotulo: 'GPT-6 Astra', faixa: 'capaz' },
  ],
}

// O modelo padrão de cada provedor é o primeiro da faixa "rápido".
export function modeloPadrao(provedor: ProvedorIa): ModeloAgente {
  const padrao = MODELOS_POR_PROVEDOR[provedor].find((m) => m.faixa === 'rapido')
  if (!padrao) throw new Error(`Provedor ${provedor} sem modelo rápido no catálogo`)
  return padrao
}

export function modeloValido(provedor: ProvedorIa, id: string): boolean {
  return MODELOS_POR_PROVEDOR[provedor].some((m) => m.id === id)
}
