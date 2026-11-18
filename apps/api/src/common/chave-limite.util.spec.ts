import { JwtService } from '@nestjs/jwt'
import { criarChaveDeLimite } from './chave-limite.util'

describe('criarChaveDeLimite', () => {
  const jwt = new JwtService({ secret: 'segredo-de-teste' })
  const chave = criarChaveDeLimite(jwt)

  it('usa o usuário do token válido', async () => {
    const token = jwt.sign({ sub: 'user-1' })
    expect(await chave({ headers: { authorization: `Bearer ${token}` }, ip: '1.1.1.1' })).toBe('usuario:user-1')
  })

  it('usa o IP sem token', async () => {
    expect(await chave({ headers: {}, ip: '1.1.1.1' })).toBe('ip:1.1.1.1')
  })

  it('usa o IP quando o token tem assinatura inválida', async () => {
    const outro = new JwtService({ secret: 'outro-segredo' }).sign({ sub: 'user-2' })
    expect(await chave({ headers: { authorization: `Bearer ${outro}` }, ip: '2.2.2.2' })).toBe('ip:2.2.2.2')
  })
})
