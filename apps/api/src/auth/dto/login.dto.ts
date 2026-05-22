import { IsEmail, IsString } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class LoginDto {
  @ApiProperty({ example: 'corretor@imobiliaria.com' })
  @IsEmail()
  email: string

  @ApiProperty()
  @IsString()
  password: string
}
