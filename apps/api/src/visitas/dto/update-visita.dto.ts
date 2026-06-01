import { IsString, IsDateString, IsOptional, IsInt, IsIn, Min } from 'class-validator'
import { ApiPropertyOptional } from '@nestjs/swagger'

export class UpdateVisitaDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  imovelId?: string

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  clienteId?: string

  @ApiPropertyOptional({ nullable: true })
  @IsString()
  @IsOptional()
  corretorId?: string | null

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  dataHora?: string

  @ApiPropertyOptional({ minimum: 15 })
  @IsInt()
  @Min(15)
  @IsOptional()
  duracaoMin?: number

  @ApiPropertyOptional({ enum: ['AGENDADA', 'REALIZADA', 'CANCELADA'] })
  @IsIn(['AGENDADA', 'REALIZADA', 'CANCELADA'])
  @IsOptional()
  status?: string

  @ApiPropertyOptional({ nullable: true })
  @IsString()
  @IsOptional()
  observacoes?: string | null
}
