import { IsUUID, ValidateIf } from 'class-validator'

export class AssociarCorretorDto {
  @ValidateIf((o) => o.corretorId !== null)
  @IsUUID()
  corretorId: string | null
}
