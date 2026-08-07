import { IsString, MinLength } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class CreateCaracteristicaDto {
  @ApiProperty({ example: 'Piscina' })
  @IsString()
  @MinLength(2)
  nome: string
}
