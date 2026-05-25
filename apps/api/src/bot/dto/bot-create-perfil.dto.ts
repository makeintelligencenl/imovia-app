import { IsString } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'
import { CreatePerfilDto } from '../../perfis/dto/create-perfil.dto'

export class BotCreatePerfilDto extends CreatePerfilDto {
  @ApiProperty({
    description: 'ID da imobiliária (tenant). Fornecido pelo GPT Maker via variável de ambiente.',
    example: 'cuid-da-imobiliaria',
  })
  @IsString()
  tenantId: string
}
