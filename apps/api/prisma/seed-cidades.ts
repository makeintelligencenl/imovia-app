import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

interface IbgeEstado  { id: number; sigla: string; nome: string }
interface IbgeMunicipio { id: number; nome: string }

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status} — ${url}`)
  return res.json() as Promise<T>
}

async function main() {
  const UFS = ['SP', 'MG']

  console.log('🗺️  Buscando estados SP e MG na API do IBGE...')
  const todosEstados = await fetchJson<IbgeEstado[]>(
    'https://servicodados.ibge.gov.br/api/v1/localidades/estados?orderBy=sigla'
  )
  const estados = todosEstados.filter((e) => UFS.includes(e.sigla))

  // Upsert estados
  for (const e of estados) {
    await prisma.estado.upsert({
      where: { id: e.id },
      update: { sigla: e.sigla, nome: e.nome },
      create: { id: e.id, sigla: e.sigla, nome: e.nome },
    })
  }
  console.log(`✅ Estados inseridos: ${estados.map((e) => e.sigla).join(', ')}`)

  // Municípios de cada estado
  let totalCidades = 0
  for (const estado of estados) {
    console.log(`\n📍 Buscando municípios de ${estado.sigla}...`)
    const municipios = await fetchJson<IbgeMunicipio[]>(
      `https://servicodados.ibge.gov.br/api/v1/localidades/estados/${estado.id}/municipios`
    )

    // Inserir em lotes de 200
    const LOTE = 200
    for (let i = 0; i < municipios.length; i += LOTE) {
      const lote = municipios.slice(i, i + LOTE)
      await Promise.all(
        lote.map((m) =>
          prisma.cidade.upsert({
            where: { id: m.id },
            update: { nome: m.nome, estadoId: estado.id },
            create: { id: m.id, nome: m.nome, estadoId: estado.id },
          })
        )
      )
      process.stdout.write(`   ${Math.min(i + LOTE, municipios.length)}/${municipios.length}\r`)
    }
    console.log(`   ✅ ${municipios.length} municípios de ${estado.sigla} inseridos`)
    totalCidades += municipios.length
  }

  console.log(`\n🎉 Concluído! ${totalCidades} cidades inseridas (SP + MG)\n`)
}

main()
  .catch((e) => { console.error('❌ Erro:', e); process.exit(1) })
  .finally(() => prisma.$disconnect())
