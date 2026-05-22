import { PrismaClient, Finalidade, StatusImovel, StatusMatch, Role } from '@prisma/client'
import * as bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🧹 Limpando tabelas...')
  await prisma.match.deleteMany()
  await prisma.perfilBusca.deleteMany()
  await prisma.imovel.deleteMany()
  console.log('✅ Tabelas limpas: matches, perfis_busca, imoveis')

  // ─────────────────────────────────────────
  // TIPOS DE IMÓVEL (tabela mestre)
  // ─────────────────────────────────────────
  const tiposData = ['Apartamento', 'Casa', 'Comercial', 'Terreno', 'Rural']
  const tipos: Record<string, string> = {}

  for (const nome of tiposData) {
    const tipo = await prisma.tipoImovel.upsert({
      where: { nome },
      update: {},
      create: { nome },
    })
    tipos[nome] = tipo.id
  }
  console.log('✅ Tipos de imóvel prontos:', Object.keys(tipos).join(', '))

  // ─────────────────────────────────────────
  // TENANTS — imobiliárias do Vale do Aço
  // ─────────────────────────────────────────
  const [tenantValeAco, tenantIpatinga, tenantAco] = await Promise.all([
    prisma.tenant.upsert({
      where: { slug: 'vale-aco-imoveis' },
      update: {},
      create: { name: 'Vale do Aço Imóveis', slug: 'vale-aco-imoveis', email: 'contato@valeacoimoveis.com.br', telefone: '(31) 3822-1234' },
    }),
    prisma.tenant.upsert({
      where: { slug: 'ipatinga-negocios' },
      update: {},
      create: { name: 'Ipatinga Negócios Imobiliários', slug: 'ipatinga-negocios', email: 'atendimento@ipatinganegocios.com.br', telefone: '(31) 3823-5678' },
    }),
    prisma.tenant.upsert({
      where: { slug: 'aco-imoveis' },
      update: {},
      create: { name: 'Aço Imóveis', slug: 'aco-imoveis', email: 'vendas@acoimoveis.com.br', telefone: '(31) 3841-9012' },
    }),
  ])
  console.log('✅ Tenants prontos')

  // ─────────────────────────────────────────
  // USERS
  // ─────────────────────────────────────────
  const senhaHash = await bcrypt.hash('senha123', 12)
  await Promise.all([
    prisma.user.upsert({ where: { email: 'admin@valeacoimoveis.com.br' }, update: {}, create: { name: 'José Carlos Admin', email: 'admin@valeacoimoveis.com.br', passwordHash: senhaHash, role: Role.ADMIN, tenantId: tenantValeAco.id } }),
    prisma.user.upsert({ where: { email: 'corretor1@valeacoimoveis.com.br' }, update: {}, create: { name: 'Cláudia Mendes', email: 'corretor1@valeacoimoveis.com.br', passwordHash: senhaHash, role: Role.CORRETOR, tenantId: tenantValeAco.id } }),
    prisma.user.upsert({ where: { email: 'admin@ipatinganegocios.com.br' }, update: {}, create: { name: 'Rogério Fonseca', email: 'admin@ipatinganegocios.com.br', passwordHash: senhaHash, role: Role.ADMIN, tenantId: tenantIpatinga.id } }),
    prisma.user.upsert({ where: { email: 'admin@acoimoveis.com.br' }, update: {}, create: { name: 'Adriana Costa', email: 'admin@acoimoveis.com.br', passwordHash: senhaHash, role: Role.ADMIN, tenantId: tenantAco.id } }),
  ])
  console.log('✅ Usuários prontos')
  console.log('\n🌱 Inserindo imóveis da região de Ipatinga/MG...')

  // ─────────────────────────────────────────
  // IMÓVEIS — Vale do Aço Imóveis
  // ─────────────────────────────────────────
  const imoveisValeAco = await Promise.all([
    prisma.imovel.create({ data: { titulo: 'Apartamento 3 quartos no Cidade Nobre', tipoId: tipos['Apartamento'], finalidade: Finalidade.VENDA, preco: 420000, areaM2: 98, quartos: 3, banheiros: 2, vagas: 2, bairro: 'Cidade Nobre', cidade: 'Ipatinga', estado: 'MG', latitude: -19.4678, longitude: -42.5280, descricao: 'Apartamento bem acabado, varanda, condomínio com piscina e salão de festas.', tenantId: tenantValeAco.id } }),
    prisma.imovel.create({ data: { titulo: 'Casa alto padrão no Cidade Nobre', tipoId: tipos['Casa'], finalidade: Finalidade.VENDA, preco: 980000, areaM2: 320, quartos: 4, banheiros: 4, vagas: 4, bairro: 'Cidade Nobre', cidade: 'Ipatinga', estado: 'MG', latitude: -19.4701, longitude: -42.5265, descricao: 'Casa em condomínio fechado, piscina, área gourmet, jardim.', tenantId: tenantValeAco.id } }),
    prisma.imovel.create({ data: { titulo: 'Apartamento 2 quartos no Bom Retiro', tipoId: tipos['Apartamento'], finalidade: Finalidade.ALUGUEL, preco: 1400, areaM2: 65, quartos: 2, banheiros: 1, vagas: 1, bairro: 'Bom Retiro', cidade: 'Ipatinga', estado: 'MG', latitude: -19.4750, longitude: -42.5320, descricao: 'Apartamento espaçoso, perto de escolas e comércio. Aceita animais.', tenantId: tenantValeAco.id } }),
    prisma.imovel.create({ data: { titulo: 'Casa 3 quartos no Bom Retiro', tipoId: tipos['Casa'], finalidade: Finalidade.VENDA, preco: 310000, areaM2: 140, quartos: 3, banheiros: 2, vagas: 2, bairro: 'Bom Retiro', cidade: 'Ipatinga', estado: 'MG', latitude: -19.4762, longitude: -42.5335, descricao: 'Casa com quintal, área de serviço, boa localização.', tenantId: tenantValeAco.id } }),
    prisma.imovel.create({ data: { titulo: 'Apartamento 1 quarto no Horto', tipoId: tipos['Apartamento'], finalidade: Finalidade.ALUGUEL, preco: 900, areaM2: 42, quartos: 1, banheiros: 1, vagas: 1, bairro: 'Horto', cidade: 'Ipatinga', estado: 'MG', latitude: -19.4820, longitude: -42.5290, descricao: 'Kitnet mobiliada próxima à Usiminas.', tenantId: tenantValeAco.id } }),
    prisma.imovel.create({ data: { titulo: 'Casa 4 quartos no Veneza', tipoId: tipos['Casa'], finalidade: Finalidade.VENDA, preco: 550000, areaM2: 220, quartos: 4, banheiros: 3, vagas: 3, bairro: 'Veneza', cidade: 'Ipatinga', estado: 'MG', latitude: -19.4640, longitude: -42.5150, descricao: 'Casa ampla com piscina, churrasqueira e área de lazer.', tenantId: tenantValeAco.id } }),
    prisma.imovel.create({ data: { titulo: 'Apartamento 3 quartos no Iguaçu', tipoId: tipos['Apartamento'], finalidade: Finalidade.VENDA, preco: 285000, areaM2: 82, quartos: 3, banheiros: 1, vagas: 1, bairro: 'Iguaçu', cidade: 'Ipatinga', estado: 'MG', latitude: -19.4890, longitude: -42.5410, descricao: 'Ótimo custo-benefício, próximo ao centro.', tenantId: tenantValeAco.id } }),
    prisma.imovel.create({ data: { titulo: 'Sala comercial no Cariru', tipoId: tipos['Comercial'], finalidade: Finalidade.ALUGUEL, preco: 2800, areaM2: 55, banheiros: 1, bairro: 'Cariru', cidade: 'Ipatinga', estado: 'MG', latitude: -19.4730, longitude: -42.5380, descricao: 'Sala em galeria comercial de alto fluxo.', tenantId: tenantValeAco.id } }),
    prisma.imovel.create({ data: { titulo: 'Casa 3 quartos no Palmeiras', tipoId: tipos['Casa'], finalidade: Finalidade.VENDA, preco: 240000, areaM2: 120, quartos: 3, banheiros: 2, vagas: 1, bairro: 'Palmeiras', cidade: 'Coronel Fabriciano', estado: 'MG', latitude: -19.5183, longitude: -42.6289, descricao: 'Casa bem localizada, 5 minutos do centro.', tenantId: tenantValeAco.id } }),
    prisma.imovel.create({ data: { titulo: 'Apartamento 2 quartos no Centro de Timóteo', tipoId: tipos['Apartamento'], finalidade: Finalidade.ALUGUEL, preco: 1100, areaM2: 60, quartos: 2, banheiros: 1, vagas: 1, bairro: 'Centro', cidade: 'Timóteo', estado: 'MG', latitude: -19.5815, longitude: -42.6451, descricao: 'Apartamento próximo à Usiminas Timóteo.', tenantId: tenantValeAco.id } }),
  ])

  // ─────────────────────────────────────────
  // IMÓVEIS — Ipatinga Negócios
  // ─────────────────────────────────────────
  const imoveisIpatinga = await Promise.all([
    prisma.imovel.create({ data: { titulo: 'Casa térrea no Bethânia', tipoId: tipos['Casa'], finalidade: Finalidade.VENDA, preco: 380000, areaM2: 160, quartos: 3, banheiros: 2, vagas: 2, bairro: 'Bethânia', cidade: 'Ipatinga', estado: 'MG', latitude: -19.4600, longitude: -42.5450, descricao: 'Casa bem conservada, cozinha planejada, quintal gramado.', tenantId: tenantIpatinga.id } }),
    prisma.imovel.create({ data: { titulo: 'Apartamento 3 quartos no Bethânia', tipoId: tipos['Apartamento'], finalidade: Finalidade.ALUGUEL, preco: 1800, areaM2: 88, quartos: 3, banheiros: 2, vagas: 1, bairro: 'Bethânia', cidade: 'Ipatinga', estado: 'MG', latitude: -19.4610, longitude: -42.5460, descricao: 'Apartamento reformado, piso porcelanato, armários planejados.', tenantId: tenantIpatinga.id } }),
    prisma.imovel.create({ data: { titulo: 'Casa 4 quartos no Grão Pará', tipoId: tipos['Casa'], finalidade: Finalidade.VENDA, preco: 650000, areaM2: 250, quartos: 4, banheiros: 3, vagas: 3, bairro: 'Grão Pará', cidade: 'Ipatinga', estado: 'MG', latitude: -19.4550, longitude: -42.5200, descricao: 'Residência de alto padrão, piscina aquecida, churrasqueira gourmet.', tenantId: tenantIpatinga.id } }),
    prisma.imovel.create({ data: { titulo: 'Terreno no Canaã', tipoId: tipos['Terreno'], finalidade: Finalidade.VENDA, preco: 180000, areaM2: 360, bairro: 'Canaã', cidade: 'Ipatinga', estado: 'MG', latitude: -19.4920, longitude: -42.5180, descricao: 'Terreno plano, escriturado, pronto para construir.', tenantId: tenantIpatinga.id } }),
    prisma.imovel.create({ data: { titulo: 'Apartamento 2 quartos no Planalto', tipoId: tipos['Apartamento'], finalidade: Finalidade.VENDA, preco: 195000, areaM2: 68, quartos: 2, banheiros: 1, vagas: 1, bairro: 'Planalto', cidade: 'Ipatinga', estado: 'MG', latitude: -19.4855, longitude: -42.5490, descricao: 'Apartamento em ótimo estado, condomínio baixo.', tenantId: tenantIpatinga.id } }),
    prisma.imovel.create({ data: { titulo: 'Casa 3 quartos em Santana do Paraíso', tipoId: tipos['Casa'], finalidade: Finalidade.VENDA, preco: 290000, areaM2: 130, quartos: 3, banheiros: 2, vagas: 2, bairro: 'Centro', cidade: 'Santana do Paraíso', estado: 'MG', latitude: -19.3680, longitude: -42.5310, descricao: 'Casa nova, nunca habitada, acabamento moderno.', tenantId: tenantIpatinga.id } }),
  ])

  // ─────────────────────────────────────────
  // IMÓVEIS — Aço Imóveis
  // ─────────────────────────────────────────
  const imoveisAco = await Promise.all([
    prisma.imovel.create({ data: { titulo: 'Casa 3 quartos no Limoeiro — Timóteo', tipoId: tipos['Casa'], finalidade: Finalidade.VENDA, preco: 270000, areaM2: 150, quartos: 3, banheiros: 2, vagas: 2, bairro: 'Limoeiro', cidade: 'Timóteo', estado: 'MG', latitude: -19.5740, longitude: -42.6480, descricao: 'Casa com quintal, área de serviço coberta e garagem para 2 carros.', tenantId: tenantAco.id } }),
    prisma.imovel.create({ data: { titulo: 'Apartamento 2 quartos no Laranjeiras — Timóteo', tipoId: tipos['Apartamento'], finalidade: Finalidade.ALUGUEL, preco: 950, areaM2: 58, quartos: 2, banheiros: 1, vagas: 1, bairro: 'Laranjeiras', cidade: 'Timóteo', estado: 'MG', latitude: -19.5800, longitude: -42.6430, descricao: 'Apartamento amplo, próximo ao comércio e transporte público.', tenantId: tenantAco.id } }),
    prisma.imovel.create({ data: { titulo: 'Sala comercial no Centro — Coronel Fabriciano', tipoId: tipos['Comercial'], finalidade: Finalidade.ALUGUEL, preco: 1800, areaM2: 40, bairro: 'Centro', cidade: 'Coronel Fabriciano', estado: 'MG', latitude: -19.5220, longitude: -42.6280, descricao: 'Sala no centro comercial de Coronel Fabriciano.', tenantId: tenantAco.id } }),
    prisma.imovel.create({ data: { titulo: 'Terreno industrial em Coronel Fabriciano', tipoId: tipos['Terreno'], finalidade: Finalidade.VENDA, preco: 420000, areaM2: 1200, bairro: 'Distrito Industrial', cidade: 'Coronel Fabriciano', estado: 'MG', descricao: 'Terreno em distrito industrial, acesso facilitado para caminhões.', tenantId: tenantAco.id } }),
    prisma.imovel.create({ data: { titulo: 'Casa 2 quartos no Caravaggio — Coronel Fabriciano', tipoId: tipos['Casa'], finalidade: Finalidade.ALUGUEL, preco: 1200, areaM2: 90, quartos: 2, banheiros: 1, vagas: 1, bairro: 'Caravaggio', cidade: 'Coronel Fabriciano', estado: 'MG', descricao: 'Casa simples e bem conservada, aceita animais.', tenantId: tenantAco.id } }),
  ])

  const totalImoveis = imoveisValeAco.length + imoveisIpatinga.length + imoveisAco.length
  console.log(`✅ Imóveis criados: ${totalImoveis}`)

  // ─────────────────────────────────────────
  // PERFIS DE BUSCA — usam connect por ID de tipo
  // ─────────────────────────────────────────
  const perfis = await Promise.all([
    prisma.perfilBusca.create({ data: { clienteNome: 'Anderson Rodrigues', clienteEmail: 'anderson.r@gmail.com', clienteWhatsapp: '+553138221001', finalidade: Finalidade.VENDA, precoMin: 250000, precoMax: 450000, areaMin: 70, quartosMin: 2, cidades: ['Ipatinga'], bairros: ['Cidade Nobre', 'Bom Retiro', 'Bethânia', 'Iguaçu'], tenantId: tenantValeAco.id, tipos: { connect: [{ id: tipos['Apartamento'] }] } } }),
    prisma.perfilBusca.create({ data: { clienteNome: 'Patrícia Oliveira', clienteEmail: 'patricia.oliveira@hotmail.com', clienteWhatsapp: '+553138221002', finalidade: Finalidade.ALUGUEL, precoMin: 800, precoMax: 1600, areaMin: 50, quartosMin: 2, cidades: ['Ipatinga'], bairros: ['Horto', 'Bom Retiro', 'Iguaçu'], tenantId: tenantValeAco.id, tipos: { connect: [{ id: tipos['Apartamento'] }, { id: tipos['Casa'] }] } } }),
    prisma.perfilBusca.create({ data: { clienteNome: 'Família Gonçalves', clienteEmail: 'jose.goncalves@yahoo.com.br', clienteWhatsapp: '+553138221003', finalidade: Finalidade.VENDA, precoMin: 450000, precoMax: 700000, areaMin: 200, quartosMin: 4, cidades: ['Ipatinga'], bairros: ['Veneza', 'Cidade Nobre', 'Grão Pará'], tenantId: tenantValeAco.id, tipos: { connect: [{ id: tipos['Casa'] }] } } }),
    prisma.perfilBusca.create({ data: { clienteNome: 'Marcos Vieira', clienteEmail: 'marcos.vieira@empresa.com', finalidade: Finalidade.ALUGUEL, precoMin: 1500, precoMax: 3500, areaMin: 40, cidades: ['Ipatinga', 'Coronel Fabriciano'], tenantId: tenantValeAco.id, tipos: { connect: [{ id: tipos['Comercial'] }] } } }),
    prisma.perfilBusca.create({ data: { clienteNome: 'Fernanda Duarte', clienteEmail: 'fe.duarte@gmail.com', clienteWhatsapp: '+553138221005', finalidade: Finalidade.VENDA, precoMin: 200000, precoMax: 320000, areaMin: 100, quartosMin: 3, cidades: ['Coronel Fabriciano', 'Timóteo'], tenantId: tenantValeAco.id, tipos: { connect: [{ id: tipos['Casa'] }] } } }),
    prisma.perfilBusca.create({ data: { clienteNome: 'Bruno Lacerda', clienteEmail: 'bruno.lacerda@gmail.com', clienteWhatsapp: '+553138231001', finalidade: Finalidade.VENDA, precoMin: 550000, precoMax: 800000, areaMin: 220, quartosMin: 4, cidades: ['Ipatinga'], bairros: ['Grão Pará', 'Veneza', 'Cidade Nobre'], tenantId: tenantIpatinga.id, tipos: { connect: [{ id: tipos['Casa'] }] } } }),
    prisma.perfilBusca.create({ data: { clienteNome: 'Simone Batista', clienteEmail: 'simone.b@hotmail.com', clienteWhatsapp: '+553138231002', finalidade: Finalidade.ALUGUEL, precoMin: 1400, precoMax: 2000, areaMin: 70, quartosMin: 2, cidades: ['Ipatinga'], bairros: ['Bethânia', 'Cidade Nobre', 'Bom Retiro'], tenantId: tenantIpatinga.id, tipos: { connect: [{ id: tipos['Apartamento'] }] } } }),
    prisma.perfilBusca.create({ data: { clienteNome: 'Construtora Vale Ltda', clienteEmail: 'compras@construtoravale.com.br', finalidade: Finalidade.VENDA, precoMin: 120000, precoMax: 250000, areaMin: 300, cidades: ['Ipatinga', 'Santana do Paraíso'], tenantId: tenantIpatinga.id, tipos: { connect: [{ id: tipos['Terreno'] }] } } }),
    prisma.perfilBusca.create({ data: { clienteNome: 'Rafael Teixeira', clienteEmail: 'rafael.t@gmail.com', clienteWhatsapp: '+553138411001', finalidade: Finalidade.VENDA, precoMin: 220000, precoMax: 320000, areaMin: 100, quartosMin: 3, cidades: ['Timóteo', 'Coronel Fabriciano'], tenantId: tenantAco.id, tipos: { connect: [{ id: tipos['Casa'] }] } } }),
    prisma.perfilBusca.create({ data: { clienteNome: 'Juliana Prado', clienteEmail: 'ju.prado@outlook.com', clienteWhatsapp: '+553138411002', finalidade: Finalidade.ALUGUEL, precoMin: 800, precoMax: 1300, areaMin: 50, quartosMin: 2, cidades: ['Timóteo'], tenantId: tenantAco.id, tipos: { connect: [{ id: tipos['Apartamento'] }, { id: tipos['Casa'] }] } } }),
  ])
  console.log(`✅ Perfis de busca criados: ${perfis.length}`)

  // ─────────────────────────────────────────
  // MATCHES
  // ─────────────────────────────────────────
  const matches = await Promise.all([
    prisma.match.create({ data: { perfilId: perfis[0].id, imovelId: imoveisValeAco[6].id, tenantId: tenantValeAco.id, status: StatusMatch.INTERESSADO } }),
    prisma.match.create({ data: { perfilId: perfis[0].id, imovelId: imoveisValeAco[0].id, tenantId: tenantValeAco.id, status: StatusMatch.VISUALIZADO } }),
    prisma.match.create({ data: { perfilId: perfis[1].id, imovelId: imoveisValeAco[2].id, tenantId: tenantValeAco.id, status: StatusMatch.INTERESSADO } }),
    prisma.match.create({ data: { perfilId: perfis[1].id, imovelId: imoveisValeAco[4].id, tenantId: tenantValeAco.id, status: StatusMatch.NOTIFICADO } }),
    prisma.match.create({ data: { perfilId: perfis[2].id, imovelId: imoveisValeAco[5].id, tenantId: tenantValeAco.id, status: StatusMatch.EM_NEGOCIACAO } }),
    prisma.match.create({ data: { perfilId: perfis[3].id, imovelId: imoveisValeAco[7].id, tenantId: tenantValeAco.id, status: StatusMatch.INTERESSADO } }),
    prisma.match.create({ data: { perfilId: perfis[3].id, imovelId: imoveisAco[2].id, tenantId: tenantValeAco.id, status: StatusMatch.NOTIFICADO } }),
    prisma.match.create({ data: { perfilId: perfis[4].id, imovelId: imoveisValeAco[8].id, tenantId: tenantValeAco.id, status: StatusMatch.VISUALIZADO } }),
    prisma.match.create({ data: { perfilId: perfis[5].id, imovelId: imoveisIpatinga[2].id, tenantId: tenantIpatinga.id, status: StatusMatch.EM_NEGOCIACAO } }),
    prisma.match.create({ data: { perfilId: perfis[6].id, imovelId: imoveisIpatinga[1].id, tenantId: tenantIpatinga.id, status: StatusMatch.INTERESSADO } }),
    prisma.match.create({ data: { perfilId: perfis[7].id, imovelId: imoveisIpatinga[3].id, tenantId: tenantIpatinga.id, status: StatusMatch.FECHADO } }),
    prisma.match.create({ data: { perfilId: perfis[8].id, imovelId: imoveisAco[0].id, tenantId: tenantAco.id, status: StatusMatch.INTERESSADO } }),
    prisma.match.create({ data: { perfilId: perfis[9].id, imovelId: imoveisAco[1].id, tenantId: tenantAco.id, status: StatusMatch.VISUALIZADO } }),
    prisma.match.create({ data: { perfilId: perfis[9].id, imovelId: imoveisAco[4].id, tenantId: tenantAco.id, status: StatusMatch.NOTIFICADO } }),
  ])

  await prisma.imovel.update({ where: { id: imoveisIpatinga[3].id }, data: { status: StatusImovel.VENDIDO } })
  console.log(`✅ Matches criados: ${matches.length}`)

  console.log('\n🎉 Seed da região de Ipatinga/MG concluído!')
  console.log('─────────────────────────────────────────────')
  console.log('📊 Resumo:')
  console.log(`   🏢 3 imobiliárias`)
  console.log(`   🏷️  ${tiposData.length} tipos de imóvel (tabela no banco)`)
  console.log(`   🏠 ${totalImoveis} imóveis`)
  console.log(`   🔍 ${perfis.length} perfis de busca`)
  console.log(`   💡 ${matches.length} matches`)
  console.log('\n📋 Logins (senha: senha123):')
  console.log('   Vale do Aço Imóveis  → admin@valeacoimoveis.com.br')
  console.log('   Ipatinga Negócios    → admin@ipatinganegocios.com.br')
  console.log('   Aço Imóveis         → admin@acoimoveis.com.br')
}

main()
  .catch((e) => { console.error('❌ Erro:', e); process.exit(1) })
  .finally(() => prisma.$disconnect())
