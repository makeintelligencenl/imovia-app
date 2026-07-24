import { IsEmail, IsString } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class CreateDemoRequestDto {
  @ApiProperty({ example: 'João Silva' })
  @IsString()
  nome: string

  @ApiProperty({ example: 'joao@imobiliaria.com' })
  @IsEmail()
  email: string

  @ApiProperty({ example: '+55 11 99999-9999' })
  @IsString()
  telefone: string

  @ApiProperty({ example: 'Imobiliária Vale do Aço' })
  @IsString()
  empresa: string

  @ApiProperty()
  @IsString()
  cfTurnstileToken: string
}
