import { IsEmail, IsString, IsOptional, MinLength, IsEnum } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class RegisterDto {
  @ApiProperty()
  @IsString()
  name: string

  @ApiProperty()
  @IsEmail()
  email: string

  @ApiProperty({ minLength: 8 })
  @IsString()
  @MinLength(8)
  password: string

  @ApiProperty({ description: 'ID da imobiliária (tenant)' })
  @IsString()
  tenantId: string

  @ApiPropertyOptional({ enum: ['ADMIN', 'CORRETOR'], default: 'CORRETOR' })
  @IsEnum(['ADMIN', 'CORRETOR'])
  @IsOptional()
  role?: 'ADMIN' | 'CORRETOR'
}
