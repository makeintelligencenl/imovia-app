import { IsString, IsNumber, IsArray, IsEnum, IsOptional, IsInt, Min } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class CreatePerfilDto {
  @ApiProperty({ description: 'ID do cliente (ver GET /clientes)' })
  @IsString()
  clienteId: string

  @ApiProperty({ enum: ['ALUGUEL', 'VENDA'] })
  @IsEnum(['ALUGUEL', 'VENDA'])
  finalidade: string

  @ApiProperty({ example: ['id-do-tipo-1'] })
  @IsArray()
  tiposIds: string[]

  @ApiProperty({ example: 200000 })
  @IsNumber()
  @Min(0)
  precoMin: number

  @ApiProperty({ example: 500000 })
  @IsNumber()
  @Min(0)
  precoMax: number

  @ApiProperty({ example: 60 })
  @IsNumber()
  @Min(1)
  areaMin: number

  @ApiPropertyOptional({ example: 150 })
  @IsNumber()
  @IsOptional()
  areaMax?: number

  @ApiPropertyOptional({ example: 2 })
  @IsNumber()
  @IsOptional()
  quartosMin?: number

  @ApiPropertyOptional({ example: 1234, description: 'ID da cidade (ver GET /localidades/cidades)' })
  @IsInt()
  @IsOptional()
  cidadeId?: number

  @ApiPropertyOptional({ example: ['Jardins', 'Moema'] })
  @IsArray()
  @IsOptional()
  bairros?: string[]
}
