import { IsString, IsNumber, IsOptional, IsInt, Min } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class CreateImovelDto {
  @ApiProperty({ example: 'Apartamento 3 quartos no Jardins' })
  @IsString()
  titulo: string

  @ApiProperty({ description: 'ID do tipo de imóvel (veja GET /api/v1/tipos)' })
  @IsString()
  tipoId: string

  @ApiProperty({ enum: ['ALUGUEL', 'VENDA'] })
  @IsString()
  finalidade: string

  @ApiProperty({ example: 350000 })
  @IsNumber()
  @Min(0)
  preco: number

  @ApiProperty({ example: 85 })
  @IsNumber()
  @Min(1)
  areaM2: number

  @ApiPropertyOptional({ example: 3 })
  @IsNumber()
  @IsOptional()
  quartos?: number

  @ApiPropertyOptional({ example: 2 })
  @IsNumber()
  @IsOptional()
  banheiros?: number

  @ApiPropertyOptional({ example: 1 })
  @IsNumber()
  @IsOptional()
  vagas?: number

  @ApiPropertyOptional({ example: 'Rua das Flores' })
  @IsString()
  @IsOptional()
  logradouro?: string

  @ApiPropertyOptional({ example: '123' })
  @IsString()
  @IsOptional()
  numero?: string

  @ApiPropertyOptional({ example: 'Apto 42' })
  @IsString()
  @IsOptional()
  complemento?: string

  @ApiProperty({ example: 'Jardins' })
  @IsString()
  bairro: string

  @ApiProperty({ example: 3550308, description: 'ID IBGE do município (veja GET /api/v1/localidades/cidades)' })
  @IsInt()
  cidadeId: number

  @ApiProperty({ example: 'SP' })
  @IsString()
  estado: string

  @ApiPropertyOptional({ example: -23.5614 })
  @IsNumber()
  @IsOptional()
  latitude?: number

  @ApiPropertyOptional({ example: -46.6553 })
  @IsNumber()
  @IsOptional()
  longitude?: number

  @ApiPropertyOptional({ example: '35170-056' })
  @IsString()
  @IsOptional()
  cep?: string

  @ApiPropertyOptional({ example: 'IMV-00123', description: 'Código do imóvel no sistema de origem da imobiliária' })
  @IsString()
  @IsOptional()
  codigoOrigem?: string

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  descricao?: string

  @ApiPropertyOptional({ example: 'https://imobiliaria.com.br/imoveis/apto-jardins-123', description: 'URL do imóvel no site da imobiliária' })
  @IsString()
  @IsOptional()
  urlImovel?: string

  @ApiPropertyOptional({ example: 250.00, description: 'Valor mensal do IPTU' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  iptu?: number

  @ApiPropertyOptional({ example: 45.00, description: 'Valor mensal do seguro incêndio' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  seguroIncendio?: number

  @ApiPropertyOptional({ example: 800.00, description: 'Taxa mensal de condomínio' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  condominio?: number

  @ApiPropertyOptional({ example: 5 })
  @IsInt()
  @Min(0)
  @IsOptional()
  andar?: number

  @ApiPropertyOptional({ example: 2 })
  @IsInt()
  @Min(0)
  @IsOptional()
  suites?: number

  @ApiPropertyOptional({ example: 'Edifício Solar das Flores' })
  @IsString()
  @IsOptional()
  nomeCondominio?: string

  @ApiPropertyOptional({ type: [String], description: 'IDs das características do imóvel' })
  @IsString({ each: true })
  @IsOptional()
  caracteristicaIds?: string[]
}
