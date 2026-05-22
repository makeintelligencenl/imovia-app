import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const perfilId = 'cmperhn0w0001mawkhvm34b6b'
  const tenantId = 'cmperelmy0002maksnemzw9da'

  const perfil = await prisma.perfilBusca.findFirst({ where: { id: perfilId } })
  if (!perfil) { console.log('Perfil não encontrado'); return }

  console.log('\n📋 Perfil:', perfil.clienteNome)
  console.log('   Finalidade:', perfil.finalidade)
  console.log('   Tipos cadastrados:', perfil.tipo)
  console.log('   Preço:', `R$${perfil.precoMin} – R$${perfil.precoMax}`)
  console.log('   Área mín:', `${perfil.areaMin} m²`)
  console.log('   Cidades:', perfil.cidades)

  const todosImoveis = await prisma.imovel.findMany({
    where: { tenantId, status: 'DISPONIVEL', finalidade: perfil.finalidade, cidade: { in: perfil.cidades } },
  })

  console.log(`\n🏠 Imóveis ALUGUEL disponíveis em Ipatinga: ${todosImoveis.length}`)
  todosImoveis.forEach((i: any) => {
    const precoOk = Number(i.preco) >= Number(perfil.precoMin) && Number(i.preco) <= Number(perfil.precoMax)
    const areaOk  = Number(i.areaM2) >= Number(perfil.areaMin)
    const tipoOk  = perfil.tipo.map((t: string) => t.toUpperCase()).includes(i.tipo)
    const ok = tipoOk && precoOk && areaOk
    console.log(`   [${ok ? '✅ MATCH' : '❌ SEM  '}] ${i.titulo}`)
    console.log(`           tipo:${i.tipo}(esperado:${perfil.tipo}) | R$${i.preco}(${precoOk?'✓':'✗'}) | ${i.areaM2}m²(${areaOk?'✓':'✗'}) | tipo(${tipoOk?'✓':'✗'})`)
  })

  // Problema identificado: tipo salvo como "Apartamento" vs enum "APARTAMENTO"
  const tiposNoBanco = [...new Set(todosImoveis.map((i: any) => i.tipo))]
  console.log('\n⚠️  Tipos encontrados nos imóveis:', tiposNoBanco)
  console.log('⚠️  Tipos no perfil:', perfil.tipo)
}

main().catch(console.error).finally(() => prisma.$disconnect())
