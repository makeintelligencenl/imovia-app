import { Controller, Get, Post, Patch, Param, Body, UseGuards, Request } from '@nestjs/common'
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
  constructor(private readonly tenantsService: TenantsService) {}

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
