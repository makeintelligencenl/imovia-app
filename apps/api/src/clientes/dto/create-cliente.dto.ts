import { IsString, IsEmail, IsOptional } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class CreateClienteDto {
  @ApiProperty({ example: 'João Silva' })
  @IsString()
  nome: string

  @ApiProperty({ example: 'joao@email.com' })
  @IsEmail()
  email: string

  @ApiPropertyOptional({ example: '+5531999999999' })
  @IsString()
  @IsOptional()
  whatsapp?: string

  @ApiPropertyOptional({ example: '+5531999999999' })
  @IsString()
  @IsOptional()
  telefone?: string

  @ApiPropertyOptional({ example: '123.456.789-00' })
  @IsString()
  @IsOptional()
  cpf?: string

  @ApiPropertyOptional({ example: 'Prefere imóveis próximos ao metrô.' })
  @IsString()
  @IsOptional()
  observacoes?: string

  @ApiPropertyOptional({ description: 'ID do corretor responsável pelo cliente' })
  @IsString()
  @IsOptional()
  corretorId?: string
}
