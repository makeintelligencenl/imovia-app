/**
 * Som sintetizado de "match" via Web Audio API — zero dependências, funciona offline.
 * Toca um arpejo ascendente C5 → E5 → G5 → C6 (acorde de dó maior).
 */
export function playMatchSound() {
  try {
    const ctx = new AudioContext()

    const playNote = (freq: number, start: number, duration = 0.35) => {
      const osc  = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, start)
      gain.gain.setValueAtTime(0, start)
      gain.gain.linearRampToValueAtTime(0.45, start + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.001, start + duration)
      osc.start(start)
      osc.stop(start + duration)
    }

    const now = ctx.currentTime
    playNote(523.25, now)           // C5
    playNote(659.25, now + 0.13)    // E5
    playNote(783.99, now + 0.26)    // G5
    playNote(1046.5, now + 0.39)    // C6 — nota final mais aguda e brilhante
  } catch {
    // Silencia se o browser bloquear AudioContext (ex: sem interação do usuário)
  }
}

/**
 * Dispara confete em duas rajadas — dos cantos inferior-esquerdo e inferior-direito.
 * Cores em tom imobiliário: azul, âmbar dourado, branco.
 */
export async function fireMatchConfetti() {
  const confetti = (await import('canvas-confetti')).default

  const colors = ['#2563EB', '#F59E0B', '#ffffff', '#60A5FA', '#FCD34D']

  const base = {
    particleCount: 90,
    spread: 60,
    colors,
    ticks: 200,
    gravity: 0.9,
    scalar: 1.1,
  }

  confetti({ ...base, angle: 55,  origin: { x: 0,   y: 0.7 } })

  await new Promise((r) => setTimeout(r, 120))

  confetti({ ...base, angle: 125, origin: { x: 1,   y: 0.7 } })

  await new Promise((r) => setTimeout(r, 350))

  // Rajada extra central com mais partículas
  confetti({
    particleCount: 50,
    angle: 90,
    spread: 80,
    origin: { x: 0.5, y: 0.6 },
    colors,
    ticks: 150,
    scalar: 0.9,
  })
}

/**
 * Dispara som + confete juntos.
 */
export function celebrateMatch() {
  playMatchSound()
  fireMatchConfetti()
}
