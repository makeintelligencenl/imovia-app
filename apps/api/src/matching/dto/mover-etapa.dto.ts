import { IsString } from 'class-validator'

export class MoverEtapaDto {
  @IsString()
  etapaId: string
}
