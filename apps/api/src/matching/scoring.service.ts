import { Injectable } from '@nestjs/common'
import { ScoringInput } from './types'

const SCORE_BASE        = 50
const SCORE_PRECO_MAX   = 20
const SCORE_CIDADE_MAX  =  5
const SCORE_BAIRRO      = 10
const SCORE_QUARTOS_MAX =  8
const SCORE_AREA_MAX    =  7

@Injectable()
export class ScoringService {
  compute({ perfil, imovel }: ScoringInput): number {
    let score = SCORE_BASE

    const preco    = Number(imovel.preco)
    const precoMin = Number(perfil.precoMin)
    const precoMax = Number(perfil.precoMax)
    const areaM2   = Number(imovel.areaM2)
    const areaMin  = Number(perfil.areaMin)

    // Centralidade do preço no range
    const range = precoMax - precoMin
    if (range > 0) {
      const centro    = (precoMin + precoMax) / 2
      const distancia = Math.abs(preco - centro) / (range / 2)
      if      (distancia <= 0.1) score += SCORE_PRECO_MAX
      else if (distancia <= 0.3) score += SCORE_PRECO_MAX / 2
    } else {
      score += SCORE_PRECO_MAX // preço exato (range = 0)
    }

    // Especificidade da cidade (cidade única = match preciso)
    if (perfil.cidadeId != null) score += SCORE_CIDADE_MAX

    // Bairro preferido
    const bairros = (perfil.bairros ?? []) as string[]
    if (bairros.length > 0 && imovel.bairro && bairros.includes(imovel.bairro)) {
      score += SCORE_BAIRRO
    }

    // Quartos
    const quartosMin = perfil.quartosMin
    const quartos    = imovel.quartos
    if (quartosMin != null && quartos != null) {
      if      (quartos > quartosMin)   score += SCORE_QUARTOS_MAX
      else if (quartos === quartosMin) score += Math.floor(SCORE_QUARTOS_MAX / 2)
    }

    // Área acima do mínimo
    if (areaMin > 0) {
      const excedente = (areaM2 - areaMin) / areaMin
      if      (excedente >= 0.20) score += SCORE_AREA_MAX
      else if (excedente >= 0.10) score += Math.floor(SCORE_AREA_MAX * 0.57)
    }

    return Math.min(100, score)
  }
}
