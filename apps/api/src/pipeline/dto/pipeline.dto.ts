import { IsString, IsHexColor, IsInt, IsOptional, IsBoolean, Min, MaxLength } from 'class-validator'

export class CreateEtapaDto {
  @IsString()
  @MaxLength(100)
  nome: string

  @IsHexColor()
  cor: string

  @IsInt()
  @Min(1)
  ordem: number
}

export class UpdateEtapaDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  nome?: string

  @IsOptional()
  @IsHexColor()
  cor?: string

  @IsOptional()
  @IsInt()
  @Min(1)
  ordem?: number

  @IsOptional()
  @IsBoolean()
  ativo?: boolean
}

export class ReorderEtapasDto {
  @IsString({ each: true })
  ids: string[]  // IDs na nova ordem
}
