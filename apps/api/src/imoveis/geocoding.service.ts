import { Injectable, Logger } from '@nestjs/common'

interface Coordenadas {
  latitude:  number
  longitude: number
}

@Injectable()
export class GeocodingService {
  private readonly logger = new Logger(GeocodingService.name)
  private lastRequestAt = 0

  async geocodificarCep(cep: string): Promise<Coordenadas | null> {
    try {
      const endereco = await this.cepParaEndereco(cep)
      if (!endereco) return null
      return await this.enderecoParaCoordenadas(endereco)
    } catch (err: any) {
      this.logger.warn(`Geocoding falhou para CEP ${cep}: ${err.message}`)
      return null
    }
  }

  private async cepParaEndereco(cep: string): Promise<string | null> {
    const limpo = cep.replace(/\D/g, '')
    const res = await fetch(`https://viacep.com.br/ws/${limpo}/json/`)
    if (!res.ok) return null
    const data = await res.json() as Record<string, string>
    if (data.erro) return null
    const partes = [data.logradouro, data.bairro, data.localidade, data.uf, 'Brasil']
      .filter(Boolean)
    return partes.join(', ')
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
