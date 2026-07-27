import { Controller, Post, Get, Body, UseGuards } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger'
import { Throttle } from '@nestjs/throttler'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { RolesGuard, Roles } from '../auth/guards/roles.guard'
import { DemoRequestsService } from './demo-requests.service'
import { CreateDemoRequestDto } from './dto/create-demo-request.dto'

@ApiTags('demo-requests')
@Controller('demo-requests')
export class DemoRequestsController {
  constructor(private readonly demoRequestsService: DemoRequestsService) {}

  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @Post()
  @ApiOperation({ summary: 'Registra uma solicitação pública de demonstração' })
  criar(@Body() dto: CreateDemoRequestDto) {
    return this.demoRequestsService.criar(dto)
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPERADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lista solicitações de demonstração (SUPERADMIN)' })
  listar() {
    return this.demoRequestsService.listar()
  }
}
