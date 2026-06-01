import {
  IsString,
  IsDateString,
  IsOptional,
  IsInt,
  IsIn,
  Min,
  IsNotEmpty,
} from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class CreateVisitaDto {
  @ApiProperty({ description: 'ID do imóvel a ser visitado' })
  @IsString()
  @IsNotEmpty()
  imovelId: string

  @ApiProperty({ description: 'ID do cliente que fará a visita' })
  @IsString()
  @IsNotEmpty()
  clienteId: string

  @ApiPropertyOptional({ description: 'ID do match que originou a visita' })
  @IsString()
  @IsOptional()
  matchId?: string

  @ApiPropertyOptional({ description: 'ID do corretor responsável (ADMIN pode informar; CORRETOR é inferido do JWT)' })
  @IsString()
  @IsOptional()
  corretorId?: string

  @ApiProperty({ description: 'Data e hora da visita em formato ISO 8601 (ex: 2026-06-15T14:00:00.000Z)' })
  @IsDateString()
  dataHora: string

  @ApiPropertyOptional({ description: 'Duração em minutos (mínimo 15, padrão 60)', minimum: 15, default: 60 })
  @IsInt()
  @Min(15)
  @IsOptional()
  duracaoMin?: number

  @ApiPropertyOptional({ enum: ['AGENDADA', 'REALIZADA', 'CANCELADA'], default: 'AGENDADA' })
  @IsIn(['AGENDADA', 'REALIZADA', 'CANCELADA'])
  @IsOptional()
  status?: string

  @ApiPropertyOptional({ description: 'Observações livres sobre a visita' })
  @IsString()
  @IsOptional()
  observacoes?: string
}
