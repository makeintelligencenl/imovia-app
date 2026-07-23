import { Injectable, Logger } from '@nestjs/common'

interface Coordenadas {
  latitude:  number
  longitude: number
}

interface EnderecoInput {
  logradouro?: string
  numero?:     string
  bairro?:     string
  cep?:        string
}

@Injectable()
export class GeocodingService {
  private readonly logger = new Logger(GeocodingService.name)
  private lastRequestAt = 0

  async geocodificarEndereco(input: EnderecoInput): Promise<Coordenadas | null> {
    try {
      const query = await this.montarQuery(input)
      if (!query) return null
      return await this.enderecoParaCoordenadas(query)
    } catch (err: any) {
      this.logger.warn(`Geocoding falhou: ${err.message}`)
      return null
    }
  }

  private async montarQuery(input: EnderecoInput): Promise<string | null> {
    // Se tiver logradouro, monta query direta (mais precisa)
    if (input.logradouro) {
      const partes = [
        input.numero ? `${input.logradouro}, ${input.numero}` : input.logradouro,
        input.bairro,
        'Brasil',
      ].filter(Boolean)
      return partes.join(', ')
    }

    // Fallback: CEP → ViaCEP → query
    if (input.cep) {
      const limpo = input.cep.replace(/\D/g, '')
      const res = await fetch(`https://viacep.com.br/ws/${limpo}/json/`)
      if (!res.ok) return null
      const data = await res.json() as Record<string, string>
      if (data.erro) return null
      const partes = [data.logradouro, data.bairro, data.localidade, data.uf, 'Brasil'].filter(Boolean)
      return partes.join(', ')
    }

    return null
  }

  private async enderecoParaCoordenadas(endereco: string): Promise<Coordenadas | null> {
    // Nominatim exige mínimo 1 segundo entre requests
    const agora = Date.now()
    const espera = 1100 - (agora - this.lastRequestAt)
    if (espera > 0) await new Promise(r => setTimeout(r, espera))
    this.lastRequestAt = Date.now()

    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(endereco)}&format=json&limit=1`
    const res = await fetch(url, {
      headers: { 'User-Agent': 'ImovIA/1.0 (nltiago@gmail.com)' },
    })
    if (!res.ok) return null
    const data = await res.json() as { lat: string; lon: string }[]
    if (!data.length) return null
    return { latitude: parseFloat(data[0].lat), longitude: parseFloat(data[0].lon) }
  }
}
