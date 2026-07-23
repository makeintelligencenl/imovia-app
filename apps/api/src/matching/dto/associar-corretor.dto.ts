import { IsUUID, IsOptional } from 'class-validator'

export class AssociarCorretorDto {
  @IsOptional()
  @IsUUID()
  corretorId: string | null
}
