import { ArrayMaxSize, IsArray, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator'

export class EnviarTextoDto {
  @IsString()
  @MinLength(1)
  @MaxLength(4096)
  texto: string
}

export class CriarClienteDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  nome: string
}

export class IniciarConversaDto {
  // Só dígitos, com DDI e DDD (ex.: 5531999998888).
  @IsString()
  @Matches(/^\d{10,15}$/, { message: 'Telefone deve conter só dígitos, com DDI e DDD.' })
  telefone: string

  @IsString()
  @MinLength(1)
  template: string

  @IsString()
  @MinLength(2)
  idioma: string

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  parametros?: string[]
}
