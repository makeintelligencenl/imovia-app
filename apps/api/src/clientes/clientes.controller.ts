import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards, Request } from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import { ClientesService } from './clientes.service'
import { CreateClienteDto } from './dto/create-cliente.dto'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'

@ApiTags('clientes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('clientes')
export class ClientesController {
  constructor(private readonly clientesService: ClientesService) {}

  @Post()
  @ApiOperation({ summary: 'Cria um novo cliente' })
  create(@Request() req: any, @Body() dto: CreateClienteDto) {
    return this.clientesService.create(req.user.tenantId, dto)
  }

  @Get()
  @ApiOperation({ summary: 'Lista clientes. Filtro: search=texto' })
  findAll(@Request() req: any, @Query('search') search?: string) {
    return this.clientesService.findAll(req.user.tenantId, search)
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalhe de um cliente com seus perfis' })
  findOne(@Request() req: any, @Param('id') id: string) {
    return this.clientesService.findById(req.user.tenantId, id)
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualiza um cliente' })
  update(@Request() req: any, @Param('id') id: string, @Body() dto: Partial<CreateClienteDto>) {
    return this.clientesService.update(req.user.tenantId, id, dto)
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remove (soft delete) um cliente' })
  remove(@Request() req: any, @Param('id') id: string) {
    return this.clientesService.remove(req.user.tenantId, id)
  }
}
