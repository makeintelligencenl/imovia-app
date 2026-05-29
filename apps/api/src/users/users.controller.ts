import { Controller, Get, Patch, Delete, Body, Param, UseGuards, Request } from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { RolesGuard, Roles } from '../auth/guards/roles.guard'
import { UsersService } from './users.service'
import { UpdateUserDto } from './dto/update-user.dto'

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiOperation({ summary: 'Lista usuários do tenant (todos os autenticados)' })
  listar(@Request() req: any) {
    return this.usersService.listar(req.user.tenantId)
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Atualiza dados de um usuário (ADMIN only)' })
  atualizar(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
  ) {
    return this.usersService.atualizar(req.user.tenantId, id, dto)
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Remove um usuário do tenant (ADMIN only)' })
  remover(@Request() req: any, @Param('id') id: string) {
    return this.usersService.remover(req.user.tenantId, id, req.user.id)
  }
}
