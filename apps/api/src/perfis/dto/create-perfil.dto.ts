import { IsString, IsNumber, IsArray, IsEnum, IsOptional, IsEmail, Min } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class CreatePerfilDto {
  @ApiProperty({ example: 'João Silva' })
  @IsString()
  clienteNome: string

  @ApiProperty({ example: 'joao@email.com' })
  @IsEmail()
  clienteEmail: string

  @ApiPropertyOptional({ example: '+5511999999999' })
  @IsString()
  @IsOptional()
  clienteWhatsapp?: string

  @ApiProperty({ enum: ['ALUGUEL', 'VENDA'] })
  @IsEnum(['ALUGUEL', 'VENDA'])
  finalidade: string

  @ApiProperty({
    example: ['id-do-tipo-1', 'id-do-tipo-2'],
    description: 'IDs dos tipos de imóvel aceitos (veja GET /api/v1/tipos)',
  })
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

  @ApiProperty({ example: ['São Paulo', 'Guarulhos'] })
  @IsArray()
  cidades: string[]

  @ApiPropertyOptional({ example: ['Jardins', 'Moema'] })
  @IsArray()
  @IsOptional()
  bairros?: string[]
}
