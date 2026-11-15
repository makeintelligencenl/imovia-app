import { IsOptional, IsString, MinLength } from 'class-validator'

export class SalvarConfiguracaoWhatsappDto {
  @IsString()
  @MinLength(1)
  phoneNumberId: string

  @IsString()
  @MinLength(1)
  businessAccountId: string

  @IsOptional()
  @IsString()
  @MinLength(1)
  accessToken?: string
}
