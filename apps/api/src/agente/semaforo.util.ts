// Limita quantas operações rodam ao mesmo tempo. As demais esperam em fila, por ordem de chegada.
export class Semaforo {
  private emUso = 0
  private readonly fila: Array<() => void> = []

  constructor(private readonly limite: number) {
    if (!Number.isInteger(limite) || limite < 1) throw new Error('O limite do semáforo deve ser inteiro e maior que zero.')
  }

  async executar<T>(fn: () => Promise<T>): Promise<T> {
    await this.adquirir()
    try {
      return await fn()
    } finally {
      this.liberar()
    }
  }

  get emEspera(): number {
    return this.fila.length
  }

  private adquirir(): Promise<void> {
    if (this.emUso < this.limite) {
      this.emUso++
      return Promise.resolve()
    }
    return new Promise((resolve) => this.fila.push(resolve))
  }

  private liberar(): void {
    const proximo = this.fila.shift()
    if (proximo) {
      // A vaga passa direto para o próximo da fila.
      proximo()
    } else {
      this.emUso--
    }
  }
}
