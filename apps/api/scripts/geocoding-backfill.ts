/**
 * Geocodifica imóveis que têm CEP mas sem latitude/longitude.
 * Uso: npx ts-node scripts/geocoding-backfill.ts [--dry-run]
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const DRY_RUN = process.argv.includes('--dry-run')

async function geocodificarCep(cep: string): Promise<{ latitude: number; longitude: number } | null> {
  const limpo = cep.replace(/\D/g, '')

  // Etapa 1: CEP → endereço via ViaCEP
  const viaCepRes = await fetch(`https://viacep.com.br/ws/${limpo}/json/`)
  if (!viaCepRes.ok) return null
  const viaCep = await viaCepRes.json() as Record<string, string>
  if (viaCep.erro) return null

  const partes = [viaCep.logradouro, viaCep.bairro, viaCep.localidade, viaCep.uf, 'Brasil'].filter(Boolean)
  const endereco = partes.join(', ')

  // Etapa 2: endereço → lat/lng via Nominatim (mínimo 1s entre requests)
  await new Promise(r => setTimeout(r, 1100))
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(endereco)}&format=json&limit=1`
  const nomRes = await fetch(url, { headers: { 'User-Agent': 'ImovIA/1.0 (nltiago@gmail.com)' } })
  if (!nomRes.ok) return null
  const nomData = await nomRes.json() as { lat: string; lon: string }[]
  if (!nomData.length) return null

  return { latitude: parseFloat(nomData[0].lat), longitude: parseFloat(nomData[0].lon) }
}

async function main() {
  const imoveis = await prisma.imovel.findMany({
    where: { cep: { not: null }, latitude: null },
    select: { id: true, titulo: true, cep: true, tenantId: true },
    orderBy: { createdAt: 'asc' },
  })

  console.log(`${imoveis.length} imóvel(is) sem coordenadas encontrado(s).`)
  if (DRY_RUN) { console.log('--dry-run: nenhuma alteração será salva.'); }

  let ok = 0, falhou = 0

  for (const imovel of imoveis) {
    process.stdout.write(`[${ok + falhou + 1}/${imoveis.length}] ${imovel.titulo} (CEP: ${imovel.cep}) ... `)
    try {
      const coords = await geocodificarCep(imovel.cep!)
      if (!coords) { console.log('sem resultado'); falhou++; continue }

      if (!DRY_RUN) {
        await prisma.imovel.update({
          where: { id: imovel.id },
          data: { latitude: coords.latitude, longitude: coords.longitude },
        })
      }
      console.log(`${coords.latitude}, ${coords.longitude}`)
      ok++
    } catch (err: any) {
      console.log(`ERRO: ${err.message}`)
      falhou++
    }
  }

  console.log(`\nConcluído: ${ok} geocodificados, ${falhou} falharam.`)
}

main().finally(() => prisma.$disconnect())
