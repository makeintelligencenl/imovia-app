import { BadRequestException, Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { PrismaService } from '../prisma/prisma.service'
import { criptografar, descriptografar } from '../whatsapp/crypto.util'
import { ProvedorIa } from './modelos-agente'

export const PROVEDORES_IA: ProvedorIa[] = ['anthropic', 'openai']

export type ChaveIaPublica = {
  provedor: ProvedorIa
  configurada: boolean
  apiKeyMascarada: string | null
}

// Mostra só os 4 últimos caracteres, sem expor a chave.
export function mascarar(chave: string): string {
  return `••••${chave.slice(-4)}`
}

@Injectable()
export class ChavesIaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  private get chaveEncriptacao(): string {
    return this.config.getOrThrow<string>('WHATSAPP_ENCRYPTION_KEY')
  }

  async listar(tenantId: string): Promise<ChaveIaPublica[]> {
    const salvas = await this.prisma.chaveIaProvedor.findMany({ where: { tenantId } })
    return PROVEDORES_IA.map((provedor) => {
      const salva = salvas.find((s) => s.provedor === provedor)
      if (!salva) return { provedor, configurada: false, apiKeyMascarada: null }
      return {
        provedor,
        configurada: true,
        apiKeyMascarada: this.mascararSalva(salva.apiKeyCriptografada),
      }
    })
  }

  async salvar(tenantId: string, provedor: ProvedorIa, apiKey: string): Promise<ChaveIaPublica> {
    if (!PROVEDORES_IA.includes(provedor)) throw new BadRequestException('Provedor de IA desconhecido.')
    const chave = apiKey.trim()
    if (chave.length < 8) throw new BadRequestException('A chave informada parece inválida.')

    const cifrada = criptografar(chave, this.chaveEncriptacao)
    await this.prisma.chaveIaProvedor.upsert({
      where: { tenantId_provedor: { tenantId, provedor } },
      create: { tenantId, provedor, apiKeyCriptografada: cifrada },
      update: { apiKeyCriptografada: cifrada },
    })
    return { provedor, configurada: true, apiKeyMascarada: mascarar(chave) }
  }

  // Usado só pelo serviço do agente, nunca exposto pela API.
  async obterChave(tenantId: string, provedor: ProvedorIa): Promise<string | null> {
    const salva = await this.prisma.chaveIaProvedor.findUnique({
      where: { tenantId_provedor: { tenantId, provedor } },
    })
    if (!salva) return null
    return descriptografar(salva.apiKeyCriptografada, this.chaveEncriptacao)
  }

  async provedoresComChave(tenantId: string): Promise<ProvedorIa[]> {
    const salvas = await this.prisma.chaveIaProvedor.findMany({
      where: { tenantId },
      select: { provedor: true },
    })
    return salvas.map((s) => s.provedor as ProvedorIa)
  }

  private mascararSalva(cifrada: string): string | null {
    try {
      return mascarar(descriptografar(cifrada, this.chaveEncriptacao))
    } catch {
      // Chave que não decifra (chave de criptografia trocada): o usuário precisa salvar de novo.
      return null
    }
  }
}
