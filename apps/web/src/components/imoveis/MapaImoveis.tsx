'use client'

import { useEffect, useRef } from 'react'

interface Imovel {
  id:         string
  titulo:     string
  preco:      number | string
  bairro:     string
  cidade:     { nome: string }
  latitude:   number | string | null
  longitude:  number | string | null
  status:     string
}

interface Props {
  imoveis: Imovel[]
  onSelect?: (id: string) => void
}

function fmtBRL(v: number | string) {
  return Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
}

export default function MapaImoveis({ imoveis, onSelect }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef       = useRef<any>(null)

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    // Leaflet só roda no browser
    import('leaflet').then((L) => {
      // Fix ícone padrão do Leaflet no Next.js
      // @ts-expect-error _getIconUrl is internal
      delete L.Icon.Default.prototype._getIconUrl
      L.Icon.Default.mergeOptions({
        iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      })

      const comCoordenadas = imoveis.filter(i => i.latitude != null && i.longitude != null)

      // Centro inicial: média das coordenadas ou Brasil
      const lat = comCoordenadas.length
        ? comCoordenadas.reduce((s, i) => s + Number(i.latitude), 0) / comCoordenadas.length
        : -15.7801
      const lng = comCoordenadas.length
        ? comCoordenadas.reduce((s, i) => s + Number(i.longitude), 0) / comCoordenadas.length
        : -47.9292

      const map = L.map(containerRef.current!).setView([lat, lng], comCoordenadas.length ? 13 : 4)
      mapRef.current = map

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map)

      comCoordenadas.forEach((imovel) => {
        const marker = L.marker([Number(imovel.latitude), Number(imovel.longitude)])
          .addTo(map)
          .bindPopup(`
            <div style="min-width:180px">
              <strong style="font-size:13px">${imovel.titulo}</strong><br/>
              <span style="color:#666;font-size:12px">${imovel.bairro}, ${imovel.cidade.nome}</span><br/>
              <span style="font-size:13px;font-weight:600;color:#16a34a">${fmtBRL(imovel.preco)}</span>
              ${onSelect ? `<br/><a href="#" onclick="window.__mapaSelectImovel('${imovel.id}');return false;" style="font-size:12px;color:#2563eb">Ver detalhes →</a>` : ''}
            </div>
          `)

        if (onSelect) {
          marker.on('click', () => {
            // expõe globalmente para o popup HTML conseguir chamar
            ;(window as any).__mapaSelectImovel = onSelect
          })
        }
      })

      // Ajusta bounds se houver múltiplos marcadores
      if (comCoordenadas.length > 1) {
        const bounds = L.latLngBounds(
          comCoordenadas.map(i => [Number(i.latitude), Number(i.longitude)] as [number, number])
        )
        map.fitBounds(bounds, { padding: [40, 40] })
      }
    })

    return () => {
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Atualiza marcadores quando a lista de imóveis muda
  useEffect(() => {
    if (!mapRef.current) return
    import('leaflet').then((L) => {
      // Remove marcadores existentes
      mapRef.current.eachLayer((layer: any) => {
        if (layer instanceof L.Marker) mapRef.current.removeLayer(layer)
      })

      const comCoordenadas = imoveis.filter(i => i.latitude != null && i.longitude != null)
      comCoordenadas.forEach((imovel) => {
        L.marker([Number(imovel.latitude), Number(imovel.longitude)])
          .addTo(mapRef.current)
          .bindPopup(`
            <div style="min-width:180px">
              <strong style="font-size:13px">${imovel.titulo}</strong><br/>
              <span style="color:#666;font-size:12px">${imovel.bairro}, ${imovel.cidade.nome}</span><br/>
              <span style="font-size:13px;font-weight:600;color:#16a34a">${fmtBRL(imovel.preco)}</span>
            </div>
          `)
      })

      if (comCoordenadas.length > 1) {
        const bounds = L.latLngBounds(
          comCoordenadas.map(i => [Number(i.latitude), Number(i.longitude)] as [number, number])
        )
        mapRef.current.fitBounds(bounds, { padding: [40, 40] })
      }
    })
  }, [imoveis])

  return (
    <>
      {/* CSS do Leaflet carregado dinamicamente */}
      <link
        rel="stylesheet"
        href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
        crossOrigin=""
      />
      <div ref={containerRef} style={{ height: '500px', width: '100%', borderRadius: '8px' }} />
    </>
  )
}
