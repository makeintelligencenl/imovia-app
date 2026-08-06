import { IsString, IsEmail, IsNumber, IsArray, IsEnum, IsOptional, Min } from 'class-validator'
import { Type } from 'class-transformer'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class BotCreateLeadDto {
  // ── Tenant ──
  @ApiProperty({ description: 'ID da imobiliária (tenant)' })
  @IsString()
  tenantId: string

  // ── Cliente ──
  @ApiProperty({ example: 'João Silva' })
  @IsString()
  clienteNome: string

  @ApiProperty({ example: 'joao@email.com' })
  @IsEmail()
  clienteEmail: string

  @ApiPropertyOptional({ example: '+5531999999999' })
  @IsString()
  @IsOptional()
  clienteWhatsapp?: string

  @ApiPropertyOptional({ description: 'ID do chat no GPT Maker — usado para vincular o match ao chat' })
  @IsString()
  @IsOptional()
  chatId?: string

  // ── Perfil de busca ──
  @ApiProperty({ enum: ['ALUGUEL', 'VENDA'] })
  @IsEnum(['ALUGUEL', 'VENDA'])
  finalidade: string

  @ApiProperty({
    example: 'Casa',
    description: 'Nome do tipo de imóvel (ex: Casa, Apartamento, Comercial, Rural, Terreno)',
  })
  @IsString()
  tipo: string

  @ApiProperty({ example: 200000 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  precoMin: number

  @ApiProperty({ example: 500000 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  precoMax: number

  @ApiPropertyOptional({ example: 60 })
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @IsOptional()
  areaMin?: number

  @ApiPropertyOptional({ example: 150 })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  areaMax?: number

  @ApiPropertyOptional({ example: 2 })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  quartosMin?: number

  @ApiProperty({
    example: 'MG-Belo Horizonte',
    description: 'Cidade no formato UF-Nome (ex: MG-Belo Horizonte, SP-São Paulo)',
  })
  @IsString()
  cidade: string

  @ApiPropertyOptional({ example: ['Savassi', 'Lourdes'] })
  @IsArray()
  @IsOptional()
  bairros?: string[]
}
