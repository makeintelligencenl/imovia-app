import { IsUUID } from 'class-validator'

export class MoverEtapaDto {
  @IsUUID()
  etapaId: string
}
