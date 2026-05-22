import { Controller, Get, UseGuards } from '@nestjs/common'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { TiposService } from './tipos.service'

@Controller('tipos')
@UseGuards(JwtAuthGuard)
export class TiposController {
  constructor(private tiposService: TiposService) {}

  @Get()
  findAll() {
    return this.tiposService.findAll()
  }
}
