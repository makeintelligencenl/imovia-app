import { IsString, IsNumber, IsDateString, IsOptional, Min } from 'class-validator'
import { Type } from 'class-transformer'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class FecharAluguelDto {
  @ApiProperty()
  @IsString()
  matchId: string

  @ApiProperty()
  @IsString()
  etapaId: string

  @ApiProperty({ description: 'Data de início do contrato (ISO 8601)' })
  @IsDateString()
  dataInicio: string

  @ApiProperty({ description: 'Duração do contrato em meses' })
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  duracaoMeses: number

  @ApiProperty({ description: 'Valor mensal negociado do aluguel' })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  valorMensal: number

  @ApiPropertyOptional({ description: 'Percentual de taxa única sobre o valor mensal' })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  percTaxaUnica?: number

  @ApiPropertyOptional()
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  valorTaxaUnicaImob?: number

  @ApiPropertyOptional()
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  valorTaxaUnicaCorr?: number
}
