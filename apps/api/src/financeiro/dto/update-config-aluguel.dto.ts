import { IsEnum, IsNumber, Min, Max } from 'class-validator'
import { Type } from 'class-transformer'
import { AluguelComissaoTipo } from '@prisma/client'

export class UpdateConfigAluguelDto {
  @IsEnum(AluguelComissaoTipo)
  comissaoTipo: AluguelComissaoTipo

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(500)
  percTaxaUnica: number

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  splitImobiliaria: number

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  splitCorretor: number
}
