import { IsString, IsEmail, IsNumber, IsArray, IsEnum, IsOptional, Min } from 'class-validator'
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

  @ApiProperty({ example: ['Belo Horizonte'] })
  @IsArray()
  cidades: string[]

  @ApiPropertyOptional({ example: ['Savassi', 'Lourdes'] })
  @IsArray()
  @IsOptional()
  bairros?: string[]
}
