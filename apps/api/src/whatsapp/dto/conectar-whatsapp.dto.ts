import { IsOptional, IsString, Matches, MinLength } from 'class-validator'

export class ConectarWhatsappDto {
  @IsString()
  @MinLength(1)
  codigo: string

  @IsOptional()
  @Matches(/^\d+$/)
  businessAccountId?: string

  @IsOptional()
  @Matches(/^\d+$/)
  phoneNumberId?: string
}
