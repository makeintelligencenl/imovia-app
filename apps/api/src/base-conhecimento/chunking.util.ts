// Divide o texto de um item da base em trechos para gerar embeddings.
// Prefere quebrar em parágrafos; parágrafo maior que o limite é cortado em pedaços.

export const TAMANHO_MAXIMO_TRECHO = 800

export function dividirEmTrechos(texto: string, tamanhoMaximo = TAMANHO_MAXIMO_TRECHO): string[] {
  const paragrafos = texto
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0)

  const trechos: string[] = []
  let atual = ''

  for (const paragrafo of paragrafos) {
    for (const pedaco of cortar(paragrafo, tamanhoMaximo)) {
      if (atual && `${atual}\n\n${pedaco}`.length > tamanhoMaximo) {
        trechos.push(atual)
        atual = pedaco
      } else {
        atual = atual ? `${atual}\n\n${pedaco}` : pedaco
      }
    }
  }
  if (atual) trechos.push(atual)
  return trechos
}

function cortar(texto: string, tamanho: number): string[] {
  if (texto.length <= tamanho) return [texto]
  const pedacos: string[] = []
  for (let i = 0; i < texto.length; i += tamanho) pedacos.push(texto.slice(i, i + tamanho))
  return pedacos
}
