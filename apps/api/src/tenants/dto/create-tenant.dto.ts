import { IsString, IsEmail, IsOptional, MinLength } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class CreateTenantDto {
  @ApiProperty({ example: 'Imobiliária Central' })
  @IsString()
  name: string

  @ApiProperty({ example: 'imobiliaria-central' })
  @IsString()
  @MinLength(3)
  slug: string

  @ApiPropertyOptional({ example: 'contato@imobiliariacentral.com.br' })
  @IsEmail()
  @IsOptional()
  email?: string

  @ApiPropertyOptional({ example: '(11) 99999-9999' })
  @IsString()
  @IsOptional()
  telefone?: string
}
