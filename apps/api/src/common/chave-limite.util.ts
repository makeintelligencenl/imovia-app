import { JwtService } from '@nestjs/jwt'

// Chave do limite de requisições: com token válido, o limite é por usuário; sem token
// (ou com token inválido/expirado), por IP. Assim, um corretor não consome o limite de outro
// que está na mesma rede. A assinatura do token é conferida, então não dá para forjar outra chave.
export function criarChaveDeLimite(jwt: JwtService) {
  return async (req: Record<string, any>): Promise<string> => {
    const cabecalho: string | undefined = req.headers?.authorization
    const token = cabecalho?.startsWith('Bearer ') ? cabecalho.slice(7) : undefined
    if (token) {
      try {
        const dados = await jwt.verifyAsync<{ sub?: string }>(token)
        if (dados.sub) return `usuario:${dados.sub}`
      } catch {
        // token inválido ou expirado: usa o IP
      }
    }
    return `ip:${req.ip}`
  }
}
