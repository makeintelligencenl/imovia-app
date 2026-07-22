import { Controller, Get, Post, Patch, Param, Body, UseGuards, Request } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger'
import { TenantsService } from './tenants.service'
import { CreateTenantDto } from './dto/create-tenant.dto'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { RolesGuard, Roles } from '../auth/guards/roles.guard'

@ApiTags('tenants')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('tenants')
export class TenantsController {
  constructor(
    private readonly tenantsService: TenantsService,
    private readonly prisma: PrismaService,
  ) {}

  // Criação restrita a ADMIN
  @Post()
  @Roles('ADMIN')
  create(@Body() dto: CreateTenantDto) {
    return this.tenantsService.create(dto)
  }

  // Listagem restrita a ADMIN (evita cross-tenant data exposure)
  @Get()
  @Roles('ADMIN')
  findAll() {
    return this.tenantsService.findAll()
  }

  // Diagnóstico temporário — verifica se RLS está ativo no banco
  @Get('_rls-status')
  @Roles('ADMIN')
  async rlsStatus() {
    const [roleRow] = await this.prisma.$queryRaw<{ rolname: string; rolbypassrls: boolean }[]>`
      SELECT rolname, rolbypassrls FROM pg_roles WHERE rolname = current_user
    `
    const tables = await this.prisma.$queryRaw<{ tablename: string; rowsecurity: boolean }[]>`
      SELECT tablename, rowsecurity FROM pg_tables
      WHERE schemaname = 'public'
        AND tablename IN ('clientes','imoveis','perfis_busca','matches','users','visitas','comissoes_venda','pipeline_etapas','match_historico')
      ORDER BY tablename
    `
    return {
      currentUser:  roleRow.rolname,
      bypassRls:    roleRow.rolbypassrls,
      rlsEfetivo:   !roleRow.rolbypassrls,
      tabelas:      tables,
    }
  }

  // Corretor só pode ver o próprio tenant
  @Get(':id')
  findOne(@Param('id') id: string, @Request() req: any) {
    if (req.user.role !== 'ADMIN' && req.user.tenantId !== id) {
      return this.tenantsService.findById(req.user.tenantId)
    }
    return this.tenantsService.findById(id)
  }

  // Atualização restrita a ADMIN
  @Patch(':id')
  @Roles('ADMIN')
  update(@Param('id') id: string, @Body() dto: Partial<CreateTenantDto>) {
    return this.tenantsService.update(id, dto)
  }
}
