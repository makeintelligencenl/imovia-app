import { BadRequestException, Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { PrismaService } from '../prisma/prisma.service'
import { criptografar, descriptografar } from './crypto.util'
import { SalvarConfiguracaoWhatsappDto } from './dto/salvar-configuracao-whatsapp.dto'

export type ConfiguracaoWhatsappPublica = {
  id: string
  phoneNumberId: string
  businessAccountId: string
  accessTokenMascarado: string
  atualizadoEm: Date
}

export type CredenciaisWhatsapp = {
  phoneNumberId: string
  businessAccountId: string
  accessToken: string
}

function mascarar(token: string): string {
  return `••••${token.slice(-4)}`
}

@Injectable()
export class ConfiguracaoWhatsappService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  private get chaveEncriptacao(): string {
    return this.config.getOrThrow<string>('WHATSAPP_ENCRYPTION_KEY')
  }

  async buscar(tenantId: string): Promise<ConfiguracaoWhatsappPublica | null> {
    const existente = await this.prisma.configuracaoWhatsapp.findUnique({ where: { tenantId } })
    if (!existente) return null
    return {
      id: existente.id,
      phoneNumberId: existente.phoneNumberId,
      businessAccountId: existente.businessAccountId,
      accessTokenMascarado: mascarar(descriptografar(existente.accessTokenCriptografado, this.chaveEncriptacao)),
      atualizadoEm: existente.atualizadoEm,
    }
  }

  // Roda dentro de withTenantRLS: o tenant vem do parâmetro, não do contexto da requisição.
  // Sem isso, a política de RLS nega a gravação quando o contexto não chega ao banco (erro 42501).
  async salvar(tenantId: string, dto: SalvarConfiguracaoWhatsappDto): Promise<ConfiguracaoWhatsappPublica> {
    return this.prisma.withTenantRLS(tenantId, async (tx) => {
      const existente = await tx.configuracaoWhatsapp.findUnique({ where: { tenantId } })

      if (!dto.accessToken && !existente) {
        throw new BadRequestException('Access token é obrigatório na primeira configuração.')
      }

      const tokenParaMascarar = dto.accessToken ?? descriptografar(existente!.accessTokenCriptografado, this.chaveEncriptacao)
      const accessTokenCriptografado = dto.accessToken
        ? criptografar(dto.accessToken, this.chaveEncriptacao)
        : existente!.accessTokenCriptografado

      const dados = {
        phoneNumberId: dto.phoneNumberId,
        businessAccountId: dto.businessAccountId,
        accessTokenCriptografado,
      }

      const salvo = await tx.configuracaoWhatsapp.upsert({
        where: { tenantId },
        create: { tenantId, ...dados },
        update: dados,
      })

      return {
        id: salvo.id,
        phoneNumberId: salvo.phoneNumberId,
        businessAccountId: salvo.businessAccountId,
        accessTokenMascarado: mascarar(tokenParaMascarar),
        atualizadoEm: salvo.atualizadoEm,
      }
    })
  }

  async remover(tenantId: string): Promise<void> {
    await this.prisma.configuracaoWhatsapp.deleteMany({ where: { tenantId } })
  }

  async removerSeContaCoincide(businessAccountId: string, ocorridoEm: Date): Promise<boolean> {
    const existente = await this.prisma.configuracaoWhatsapp.findFirst({ where: { businessAccountId } })
    if (!existente) return false
    if (existente.atualizadoEm.getTime() > ocorridoEm.getTime()) return false
    await this.prisma.configuracaoWhatsapp.deleteMany({ where: { id: existente.id } })
    return true
  }

  // Usa o tenant explícito: o agente responde pelo webhook, onde não há usuário logado,
  // e sem o contexto a política de RLS nega a leitura das credenciais.
  async obterCredenciais(tenantId: string): Promise<CredenciaisWhatsapp | null> {
    const existente = await this.prisma.withTenantRLS(tenantId, (tx) =>
      tx.configuracaoWhatsapp.findUnique({ where: { tenantId } }),
    )
    if (!existente) return null
    return {
      phoneNumberId: existente.phoneNumberId,
      businessAccountId: existente.businessAccountId,
      accessToken: descriptografar(existente.accessTokenCriptografado, this.chaveEncriptacao),
    }
  }
}
