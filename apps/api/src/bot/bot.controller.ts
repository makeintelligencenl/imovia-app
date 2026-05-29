import { Controller, Post, Get, Body, Query, UseGuards } from '@nestjs/common'
import { ApiTags, ApiSecurity, ApiOperation, ApiQuery } from '@nestjs/swagger'
import { ApiKeyGuard } from '../auth/guards/api-key.guard'
import { PerfisService } from '../perfis/perfis.service'
import { MatchingService } from '../matching/matching.service'
import { TiposService } from '../tipos/tipos.service'
import { TenantsService } from '../tenants/tenants.service'
import { BotCreatePerfilDto } from './dto/bot-create-perfil.dto'

@ApiTags('bot')
@ApiSecurity('x-bot-api-key')
@UseGuards(ApiKeyGuard)
@Controller('bot')
export class BotController {
  constructor(
    private readonly perfisService: PerfisService,
    private readonly matchingService: MatchingService,
    private readonly tiposService: TiposService,
    private readonly tenantsService: TenantsService,
  ) {}

  // ─────────────────────────────────────────
  // Ferramenta 1: Cadastrar perfil de busca
  // Chamada pelo agente após coletar dados do lead
  // ─────────────────────────────────────────
  @Post('perfil')
  @ApiOperation({
    summary: 'Cadastra um perfil de busca para um lead',
    description:
      'Cria o perfil e dispara o matching automático com os imóveis já disponíveis no portfólio.',
  })
  async cadastrarPerfil(@Body() dto: BotCreatePerfilDto) {
    const { tenantId, ...perfilData } = dto
    const perfil = await this.perfisService.create(tenantId, perfilData)
    return {
      perfilId: perfil.id,
      clienteId: perfil.clienteId,
      clienteNome: perfil.cliente?.nome,
      clienteEmail: perfil.cliente?.email,
      clienteWhatsapp: perfil.cliente?.whatsapp,
      finalidade: perfil.finalidade,
      precoMin: perfil.precoMin,
      precoMax: perfil.precoMax,
      cidades: perfil.cidades,
      tipos: perfil.tipos.map((t: { id: string; nome: string }) => ({ id: t.id, nome: t.nome })),
      criadoEm: perfil.createdAt,
    }
  }

  // ─────────────────────────────────────────
  // Ferramenta 2: Buscar imóveis compatíveis
  // Retorna os imóveis que já fizeram match com o perfil
  // ─────────────────────────────────────────
  @Get('imoveis')
  @ApiOperation({
    summary: 'Retorna imóveis compatíveis com o perfil de busca',
    description:
      'Busca os matches gerados automaticamente pelo sistema para um determinado perfil.',
  })
  @ApiQuery({ name: 'perfilId', required: true })
  @ApiQuery({ name: 'tenantId', required: true })
  async buscarImoveis(
    @Query('perfilId') perfilId: string,
    @Query('tenantId') tenantId: string,
  ) {
    const matches = await this.matchingService.listarMatches(tenantId, '', 'ADMIN', { perfilId })

    if (matches.length === 0) {
      return {
        total: 0,
        mensagem: 'Nenhum imóvel compatível encontrado no momento. O corretor será notificado assim que surgir uma opção.',
        imoveis: [],
      }
    }

    return {
      total: matches.length,
      imoveis: matches.map((m) => ({
        matchId: m.id,
        statusMatch: (m as any).etapa?.nome ?? null,
        imovel: {
          id: m.imovel.id,
          titulo: m.imovel.titulo,
          tipo: (m.imovel as any).tipo?.nome ?? null,
          finalidade: m.imovel.finalidade,
          preco: m.imovel.preco,
          areaM2: m.imovel.areaM2,
          quartos: m.imovel.quartos,
          banheiros: m.imovel.banheiros,
          vagas: m.imovel.vagas,
          bairro: m.imovel.bairro,
          cidade: (m.imovel as any).cidade?.nome ?? '',
          estado: m.imovel.estado,
          descricao: m.imovel.descricao,
          urlImovel: (m.imovel as any).urlImovel ?? null,
        },
      })),
    }
  }

  // ─────────────────────────────────────────
  // Auxiliar: Listar tipos de imóvel
  // O agente usa para mapear o tipo informado pelo lead ao ID correto
  // ─────────────────────────────────────────
  @Get('tipos')
  @ApiOperation({
    summary: 'Lista os tipos de imóvel disponíveis',
    description: 'Use para obter os IDs corretos de tipo antes de cadastrar um perfil.',
  })
  listarTipos() {
    return this.tiposService.findAll()
  }

  // ─────────────────────────────────────────
  // Auxiliar: Buscar tenantId pelo slug
  // Use para descobrir o ID da imobiliária sem acessar o banco diretamente
  // ─────────────────────────────────────────
  @Get('tenant')
  @ApiOperation({
    summary: 'Retorna o ID da imobiliária pelo slug',
    description: 'Use para configurar o IMOVIA_TENANT_ID sem precisar acessar o banco de dados.',
  })
  @ApiQuery({ name: 'slug', required: true, example: 'vale-aco-imoveis' })
  async getTenant(@Query('slug') slug: string) {
    const tenant = await this.tenantsService.findBySlug(slug)
    return {
      id: tenant.id,
      nome: tenant.name,
      slug: tenant.slug,
    }
  }
}
