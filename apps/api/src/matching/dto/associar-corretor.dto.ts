import { IsString, ValidateIf } from 'class-validator'

export class AssociarCorretorDto {
  @ValidateIf((o) => o.corretorId !== null)
  @IsString()
  corretorId: string | null
}
