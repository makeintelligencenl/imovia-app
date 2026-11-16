import { Semaforo } from './semaforo.util'

describe('Semaforo', () => {
  it('nunca deixa passar do limite ao mesmo tempo', async () => {
    const semaforo = new Semaforo(2)
    let ativos = 0
    let pico = 0
    const tarefa = async () => {
      ativos++
      pico = Math.max(pico, ativos)
      await new Promise((r) => setTimeout(r, 5))
      ativos--
    }
    await Promise.all(Array.from({ length: 6 }, () => semaforo.executar(tarefa)))
    expect(pico).toBe(2)
  })

  it('o sexto pedido espera uma vaga', async () => {
    const semaforo = new Semaforo(5)
    const travas: Array<() => void> = []
    const bloqueia = () => new Promise<void>((resolve) => travas.push(resolve))

    const execucoes = Array.from({ length: 6 }, () => semaforo.executar(bloqueia))
    await new Promise((r) => setImmediate(r))
    expect(semaforo.emEspera).toBe(1)

    travas[0]()
    await new Promise((r) => setImmediate(r))
    expect(semaforo.emEspera).toBe(0)
    travas.slice(1).forEach((t) => t())
    await Promise.all(execucoes)
  })

  it('libera a vaga mesmo quando a tarefa falha', async () => {
    const semaforo = new Semaforo(1)
    await expect(semaforo.executar(async () => Promise.reject(new Error('falhou')))).rejects.toThrow('falhou')
    await expect(semaforo.executar(async () => 'ok')).resolves.toBe('ok')
  })

  it('rejeita limite inválido', () => {
    expect(() => new Semaforo(0)).toThrow()
  })
})
