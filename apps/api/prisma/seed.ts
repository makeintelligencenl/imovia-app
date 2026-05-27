import { PrismaClient, Finalidade, StatusImovel, StatusMatch, Role } from '@prisma/client'
import * as bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

// Busca ID IBGE de uma cidade pelo nome exato e sigla do estado
async function cidadeId(prisma: PrismaClient, nome: string, uf: string): Promise<number> {
  const c = await prisma.cidade.findFirst({
    where: { nome, estado: { sigla: uf } },
    select: { id: true },
  })
  if (!c) throw new Error(`Cidade não encontrada: ${nome} (${uf}) — rode seed-cidades primeiro`)
  return c.id
}

async function main() {
  console.log('🌱 Iniciando seed multi-cidade...\n')

  // ─────────────────────────────────────────
  // TIPOS DE IMÓVEL
  // ─────────────────────────────────────────
  const tiposData = ['Apartamento', 'Casa', 'Comercial', 'Terreno', 'Rural']
  const tipos: Record<string, string> = {}
  for (const nome of tiposData) {
    const t = await prisma.tipoImovel.upsert({ where: { nome }, update: {}, create: { nome } })
    tipos[nome] = t.id
  }
  console.log('✅ Tipos de imóvel:', tiposData.join(', '))

  // ─────────────────────────────────────────
  // TENANTS
  // ─────────────────────────────────────────
  const [tenantSP, tenantBH, tenantIPA] = await Promise.all([
    prisma.tenant.upsert({
      where: { slug: 'paulista-imoveis' },
      update: {},
      create: { name: 'Paulista Imóveis', slug: 'paulista-imoveis', email: 'contato@paulistaimoveis.com.br', telefone: '(11) 3456-7890' },
    }),
    prisma.tenant.upsert({
      where: { slug: 'bh-premium-imoveis' },
      update: {},
      create: { name: 'BH Premium Imóveis', slug: 'bh-premium-imoveis', email: 'contato@bhpremium.com.br', telefone: '(31) 3322-5566' },
    }),
    prisma.tenant.upsert({
      where: { slug: 'vale-aco-imoveis' },
      update: {},
      create: { name: 'Vale do Aço Imóveis', slug: 'vale-aco-imoveis', email: 'contato@valeacoimoveis.com.br', telefone: '(31) 3822-1234' },
    }),
  ])
  console.log('✅ Imobiliárias: Paulista Imóveis (SP) | BH Premium (BH) | Vale do Aço (Ipatinga)')

  // ─────────────────────────────────────────
  // USUÁRIOS  — senha: Imov@2025
  // ─────────────────────────────────────────
  const hash = await bcrypt.hash('Imov@2025', 12)
  await Promise.all([
    prisma.user.upsert({ where: { email: 'admin@paulistaimoveis.com.br' }, update: {}, create: { name: 'Rafael Monteiro',  email: 'admin@paulistaimoveis.com.br', passwordHash: hash, role: Role.ADMIN,    tenantId: tenantSP.id } }),
    prisma.user.upsert({ where: { email: 'admin@bhpremium.com.br'       }, update: {}, create: { name: 'Cristiane Lopes',  email: 'admin@bhpremium.com.br',       passwordHash: hash, role: Role.ADMIN,    tenantId: tenantBH.id } }),
    prisma.user.upsert({ where: { email: 'admin@valeacoimoveis.com.br'  }, update: {}, create: { name: 'José Carlos Silva', email: 'admin@valeacoimoveis.com.br',  passwordHash: hash, role: Role.ADMIN,    tenantId: tenantIPA.id } }),
  ])
  console.log('✅ Usuários criados (senha: Imov@2025)\n')

  // ═══════════════════════════════════════════
  // SÃO PAULO — 10 imóveis
  // ═══════════════════════════════════════════
  console.log('🏙️  Inserindo imóveis de São Paulo...')
  const cidSP = await cidadeId(prisma, 'São Paulo', 'SP')
  const iSP = await Promise.all([
    prisma.imovel.create({ data: { titulo: 'Apartamento 2 quartos em Pinheiros',         tipoId: tipos['Apartamento'], finalidade: Finalidade.ALUGUEL, preco: 4500,      areaM2: 65,  quartos: 2, banheiros: 1, vagas: 1, bairro: 'Pinheiros',         cidadeId: cidSP, estado: 'SP', descricao: 'Apto reformado, varanda, condomínio com academia. Próximo ao metrô.',           tenantId: tenantSP.id } }),
    prisma.imovel.create({ data: { titulo: 'Apartamento 3 quartos em Moema',              tipoId: tipos['Apartamento'], finalidade: Finalidade.VENDA,   preco: 890000,    areaM2: 95,  quartos: 3, banheiros: 2, vagas: 2, bairro: 'Moema',              cidadeId: cidSP, estado: 'SP', descricao: 'Planta moderna, lazer completo, portaria 24h. Próximo ao Ibirapuera.',          tenantId: tenantSP.id } }),
    prisma.imovel.create({ data: { titulo: 'Casa 4 quartos em Alto de Pinheiros',         tipoId: tipos['Casa'],        finalidade: Finalidade.VENDA,   preco: 2100000,   areaM2: 280, quartos: 4, banheiros: 4, vagas: 4, bairro: 'Alto de Pinheiros',   cidadeId: cidSP, estado: 'SP', descricao: 'Casa de alto padrão, piscina aquecida, jardim, home theater.',                 tenantId: tenantSP.id } }),
    prisma.imovel.create({ data: { titulo: 'Sala Comercial em Itaim Bibi',                tipoId: tipos['Comercial'],   finalidade: Finalidade.ALUGUEL, preco: 8000,      areaM2: 80,  banheiros: 2, vagas: 2, bairro: 'Itaim Bibi',             cidadeId: cidSP, estado: 'SP', descricao: 'Sala em andar alto, vista panorâmica, prédio triple A.',                     tenantId: tenantSP.id } }),
    prisma.imovel.create({ data: { titulo: 'Apartamento 1 quarto na Vila Madalena',       tipoId: tipos['Apartamento'], finalidade: Finalidade.ALUGUEL, preco: 2800,      areaM2: 45,  quartos: 1, banheiros: 1, vagas: 1, bairro: 'Vila Madalena',       cidadeId: cidSP, estado: 'SP', descricao: 'Studio moderno, decorado, próximo a bares e restaurantes.',                  tenantId: tenantSP.id } }),
    prisma.imovel.create({ data: { titulo: 'Apartamento 2 quartos no Brooklin',           tipoId: tipos['Apartamento'], finalidade: Finalidade.VENDA,   preco: 580000,    areaM2: 72,  quartos: 2, banheiros: 2, vagas: 1, bairro: 'Brooklin',            cidadeId: cidSP, estado: 'SP', descricao: 'Prédio novo, área de lazer completa, próximo à Av. João Dias.',              tenantId: tenantSP.id } }),
    prisma.imovel.create({ data: { titulo: 'Casa 3 quartos no Morumbi para aluguel',      tipoId: tipos['Casa'],        finalidade: Finalidade.ALUGUEL, preco: 6500,      areaM2: 160, quartos: 3, banheiros: 3, vagas: 2, bairro: 'Morumbi',             cidadeId: cidSP, estado: 'SP', descricao: 'Casa em condomínio fechado, piscina, quadra, segurança 24h.',                tenantId: tenantSP.id } }),
    prisma.imovel.create({ data: { titulo: 'Apartamento 3 quartos na Vila Olímpia',       tipoId: tipos['Apartamento'], finalidade: Finalidade.VENDA,   preco: 1200000,   areaM2: 110, quartos: 3, banheiros: 3, vagas: 2, bairro: 'Vila Olímpia',        cidadeId: cidSP, estado: 'SP', descricao: 'Cobertura duplex, terraço privativo, acabamento premium.',                   tenantId: tenantSP.id } }),
    prisma.imovel.create({ data: { titulo: 'Loja no Jardins',                             tipoId: tipos['Comercial'],   finalidade: Finalidade.ALUGUEL, preco: 15000,     areaM2: 120, bairro: 'Jardins',                cidadeId: cidSP, estado: 'SP', descricao: 'Loja em ponto nobre dos Jardins, alto fluxo de pedestres.',                   tenantId: tenantSP.id } }),
    prisma.imovel.create({ data: { titulo: 'Apartamento 2 quartos no Tatuapé',            tipoId: tipos['Apartamento'], finalidade: Finalidade.VENDA,   preco: 420000,    areaM2: 70,  quartos: 2, banheiros: 1, vagas: 1, bairro: 'Tatuapé',             cidadeId: cidSP, estado: 'SP', descricao: 'Próximo ao metrô Tatuapé, comércio local, ótimo custo-benefício.',          tenantId: tenantSP.id } }),
  ])
  console.log(`   ✅ ${iSP.length} imóveis de São Paulo`)

  // ═══════════════════════════════════════════
  // BELO HORIZONTE — 10 imóveis
  // ═══════════════════════════════════════════
  console.log('🏛️  Inserindo imóveis de Belo Horizonte...')
  const cidBH = await cidadeId(prisma, 'Belo Horizonte', 'MG')
  const iBH = await Promise.all([
    prisma.imovel.create({ data: { titulo: 'Apartamento 3 quartos na Savassi',            tipoId: tipos['Apartamento'], finalidade: Finalidade.VENDA,   preco: 650000,    areaM2: 98,  quartos: 3, banheiros: 2, vagas: 2, bairro: 'Savassi',             cidadeId: cidBH, estado: 'MG', descricao: 'Apto amplo, armários planejados, lazer completo.',                          tenantId: tenantBH.id } }),
    prisma.imovel.create({ data: { titulo: 'Apartamento 2 quartos no Funcionários',       tipoId: tipos['Apartamento'], finalidade: Finalidade.ALUGUEL, preco: 2800,      areaM2: 70,  quartos: 2, banheiros: 1, vagas: 1, bairro: 'Funcionários',         cidadeId: cidBH, estado: 'MG', descricao: 'Localização privilegiada, próximo à Praça da Liberdade.',                  tenantId: tenantBH.id } }),
    prisma.imovel.create({ data: { titulo: 'Casa 4 quartos nas Mangabeiras',               tipoId: tipos['Casa'],        finalidade: Finalidade.VENDA,   preco: 1800000,   areaM2: 320, quartos: 4, banheiros: 4, vagas: 4, bairro: 'Mangabeiras',          cidadeId: cidBH, estado: 'MG', descricao: 'Mansão com piscina, área gourmet, vista panorâmica da cidade.',             tenantId: tenantBH.id } }),
    prisma.imovel.create({ data: { titulo: 'Sala Comercial no Centro de BH',               tipoId: tipos['Comercial'],   finalidade: Finalidade.ALUGUEL, preco: 3500,      areaM2: 60,  banheiros: 1, vagas: 1, bairro: 'Centro',                 cidadeId: cidBH, estado: 'MG', descricao: 'Sala no centro comercial, fácil acesso, prédio com elevador.',              tenantId: tenantBH.id } }),
    prisma.imovel.create({ data: { titulo: 'Apartamento 1 quarto no Lourdes',              tipoId: tipos['Apartamento'], finalidade: Finalidade.ALUGUEL, preco: 2200,      areaM2: 42,  quartos: 1, banheiros: 1, vagas: 1, bairro: 'Lourdes',              cidadeId: cidBH, estado: 'MG', descricao: 'Studio moderno, mobiliado, próximo à Av. do Contorno.',                    tenantId: tenantBH.id } }),
    prisma.imovel.create({ data: { titulo: 'Casa 3 quartos no Buritis',                    tipoId: tipos['Casa'],        finalidade: Finalidade.VENDA,   preco: 580000,    areaM2: 180, quartos: 3, banheiros: 3, vagas: 3, bairro: 'Buritis',              cidadeId: cidBH, estado: 'MG', descricao: 'Casa em condomínio, piscina, área de lazer, rua tranquila.',                tenantId: tenantBH.id } }),
    prisma.imovel.create({ data: { titulo: 'Apartamento 2 quartos no Belvedere',           tipoId: tipos['Apartamento'], finalidade: Finalidade.VENDA,   preco: 480000,    areaM2: 78,  quartos: 2, banheiros: 2, vagas: 1, bairro: 'Belvedere',            cidadeId: cidBH, estado: 'MG', descricao: 'Prédio moderno, varanda gourmet, portaria 24h.',                            tenantId: tenantBH.id } }),
    prisma.imovel.create({ data: { titulo: 'Galpão Comercial no Barreiro',                 tipoId: tipos['Comercial'],   finalidade: Finalidade.ALUGUEL, preco: 5000,      areaM2: 300, bairro: 'Barreiro',               cidadeId: cidBH, estado: 'MG', descricao: 'Galpão com piso industrial, 5m de pé-direito, acesso para caminhões.',       tenantId: tenantBH.id } }),
    prisma.imovel.create({ data: { titulo: 'Apartamento 4 quartos no Belvedere',           tipoId: tipos['Apartamento'], finalidade: Finalidade.VENDA,   preco: 1100000,   areaM2: 140, quartos: 4, banheiros: 3, vagas: 3, bairro: 'Belvedere',            cidadeId: cidBH, estado: 'MG', descricao: 'Cobertura com terraço e piscina privativa.',                                tenantId: tenantBH.id } }),
    prisma.imovel.create({ data: { titulo: 'Casa 3 quartos no Caiçara',                    tipoId: tipos['Casa'],        finalidade: Finalidade.VENDA,   preco: 320000,    areaM2: 140, quartos: 3, banheiros: 2, vagas: 2, bairro: 'Caiçara',              cidadeId: cidBH, estado: 'MG', descricao: 'Casa espaçosa, quintal, área de serviço, próxima ao comércio local.',       tenantId: tenantBH.id } }),
  ])
  console.log(`   ✅ ${iBH.length} imóveis de Belo Horizonte`)

  // ═══════════════════════════════════════════
  // IPATINGA — 10 imóveis
  // ═══════════════════════════════════════════
  console.log('🏗️  Inserindo imóveis de Ipatinga...')
  const cidIPA = await cidadeId(prisma, 'Ipatinga', 'MG')
  const cidCorFab = await cidadeId(prisma, 'Coronel Fabriciano', 'MG')
  const cidTimoteo = await cidadeId(prisma, 'Timóteo', 'MG')
  const iIPA = await Promise.all([
    prisma.imovel.create({ data: { titulo: 'Apartamento 3 quartos no Cidade Nobre',       tipoId: tipos['Apartamento'], finalidade: Finalidade.VENDA,   preco: 420000,    areaM2: 98,  quartos: 3, banheiros: 2, vagas: 2, bairro: 'Cidade Nobre',          cidadeId: cidIPA,    estado: 'MG', descricao: 'Apartamento bem acabado, varanda, piscina e salão de festas.',               tenantId: tenantIPA.id } }),
    prisma.imovel.create({ data: { titulo: 'Casa alto padrão no Cidade Nobre',             tipoId: tipos['Casa'],        finalidade: Finalidade.VENDA,   preco: 980000,    areaM2: 320, quartos: 4, banheiros: 4, vagas: 4, bairro: 'Cidade Nobre',          cidadeId: cidIPA,    estado: 'MG', descricao: 'Casa em condomínio fechado, piscina, área gourmet, jardim.',                tenantId: tenantIPA.id } }),
    prisma.imovel.create({ data: { titulo: 'Apartamento 2 quartos no Bom Retiro',          tipoId: tipos['Apartamento'], finalidade: Finalidade.ALUGUEL, preco: 1400,      areaM2: 65,  quartos: 2, banheiros: 1, vagas: 1, bairro: 'Bom Retiro',             cidadeId: cidIPA,    estado: 'MG', descricao: 'Apartamento espaçoso, perto de escolas e comércio. Aceita animais.',         tenantId: tenantIPA.id } }),
    prisma.imovel.create({ data: { titulo: 'Casa 3 quartos no Bom Retiro',                 tipoId: tipos['Casa'],        finalidade: Finalidade.VENDA,   preco: 310000,    areaM2: 140, quartos: 3, banheiros: 2, vagas: 2, bairro: 'Bom Retiro',             cidadeId: cidIPA,    estado: 'MG', descricao: 'Casa com quintal, área de serviço, boa localização.',                       tenantId: tenantIPA.id } }),
    prisma.imovel.create({ data: { titulo: 'Apartamento 1 quarto no Horto',                tipoId: tipos['Apartamento'], finalidade: Finalidade.ALUGUEL, preco: 900,       areaM2: 42,  quartos: 1, banheiros: 1, vagas: 1, bairro: 'Horto',                  cidadeId: cidIPA,    estado: 'MG', descricao: 'Kitnet mobiliada próxima à Usiminas.',                                      tenantId: tenantIPA.id } }),
    prisma.imovel.create({ data: { titulo: 'Casa 4 quartos no Veneza',                     tipoId: tipos['Casa'],        finalidade: Finalidade.VENDA,   preco: 550000,    areaM2: 220, quartos: 4, banheiros: 3, vagas: 3, bairro: 'Veneza',                 cidadeId: cidIPA,    estado: 'MG', descricao: 'Casa ampla com piscina, churrasqueira e área de lazer.',                    tenantId: tenantIPA.id } }),
    prisma.imovel.create({ data: { titulo: 'Apartamento 3 quartos no Iguaçu',              tipoId: tipos['Apartamento'], finalidade: Finalidade.VENDA,   preco: 285000,    areaM2: 82,  quartos: 3, banheiros: 1, vagas: 1, bairro: 'Iguaçu',                 cidadeId: cidIPA,    estado: 'MG', descricao: 'Ótimo custo-benefício, próximo ao centro.',                                 tenantId: tenantIPA.id } }),
    prisma.imovel.create({ data: { titulo: 'Sala comercial no Cariru',                     tipoId: tipos['Comercial'],   finalidade: Finalidade.ALUGUEL, preco: 2800,      areaM2: 55,  banheiros: 1, bairro: 'Cariru',                  cidadeId: cidIPA,    estado: 'MG', descricao: 'Sala em galeria comercial de alto fluxo.',                                  tenantId: tenantIPA.id } }),
    prisma.imovel.create({ data: { titulo: 'Casa 3 quartos em Coronel Fabriciano',         tipoId: tipos['Casa'],        finalidade: Finalidade.VENDA,   preco: 240000,    areaM2: 120, quartos: 3, banheiros: 2, vagas: 1, bairro: 'Palmeiras',              cidadeId: cidCorFab, estado: 'MG', descricao: 'Casa bem localizada, 5 minutos do centro.',                    tenantId: tenantIPA.id } }),
    prisma.imovel.create({ data: { titulo: 'Apartamento 2 quartos no Centro de Timóteo',   tipoId: tipos['Apartamento'], finalidade: Finalidade.ALUGUEL, preco: 1100,      areaM2: 60,  quartos: 2, banheiros: 1, vagas: 1, bairro: 'Centro',                 cidadeId: cidTimoteo,estado: 'MG', descricao: 'Apartamento próximo à Usiminas Timóteo.',                                   tenantId: tenantIPA.id } }),
  ])
  console.log(`   ✅ ${iIPA.length} imóveis de Ipatinga/Vale do Aço`)

  // ═══════════════════════════════════════════
  // PERFIS DE BUSCA — São Paulo (5)
  // ═══════════════════════════════════════════
  console.log('\n🔍 Criando perfis de busca...')
  const pSP = await Promise.all([
    prisma.perfilBusca.create({ data: { clienteNome: 'Carlos Ferreira',   clienteEmail: 'carlos.ferreira@gmail.com',    clienteWhatsapp: '+5511991110001', finalidade: Finalidade.VENDA,   precoMin: 400000,  precoMax: 650000,   areaMin: 60,  quartosMin: 2, cidades: ['São Paulo'], bairros: ['Brooklin', 'Vila Olímpia', 'Moema'],           tenantId: tenantSP.id, tipos: { connect: [{ id: tipos['Apartamento'] }] } } }),
    prisma.perfilBusca.create({ data: { clienteNome: 'Mariana Santos',    clienteEmail: 'mariana.santos@hotmail.com',   clienteWhatsapp: '+5511991110002', finalidade: Finalidade.ALUGUEL, precoMin: 2500,    precoMax: 4500,     areaMin: 40,  quartosMin: 1, cidades: ['São Paulo'], bairros: ['Vila Madalena', 'Pinheiros', 'Brooklin'],       tenantId: tenantSP.id, tipos: { connect: [{ id: tipos['Apartamento'] }] } } }),
    prisma.perfilBusca.create({ data: { clienteNome: 'TechCorp Ltda',     clienteEmail: 'expansao@techcorp.com.br',                                        finalidade: Finalidade.ALUGUEL, precoMin: 6000,    precoMax: 18000,    areaMin: 70,               cidades: ['São Paulo'], bairros: ['Itaim Bibi', 'Jardins', 'Vila Olímpia'],       tenantId: tenantSP.id, tipos: { connect: [{ id: tipos['Comercial'] }] } } }),
    prisma.perfilBusca.create({ data: { clienteNome: 'Roberto Almeida',   clienteEmail: 'roberto.almeida@outlook.com',  clienteWhatsapp: '+5511991110004', finalidade: Finalidade.VENDA,   precoMin: 1500000, precoMax: 2500000,  areaMin: 250, quartosMin: 4, cidades: ['São Paulo'], bairros: ['Alto de Pinheiros', 'Morumbi', 'Jardins'],      tenantId: tenantSP.id, tipos: { connect: [{ id: tipos['Casa'] }] } } }),
    prisma.perfilBusca.create({ data: { clienteNome: 'Letícia Costa',     clienteEmail: 'leticia.costa@gmail.com',      clienteWhatsapp: '+5511991110005', finalidade: Finalidade.VENDA,   precoMin: 800000,  precoMax: 1300000,  areaMin: 90,  quartosMin: 3, cidades: ['São Paulo'], bairros: ['Moema', 'Vila Olímpia', 'Itaim Bibi'],          tenantId: tenantSP.id, tipos: { connect: [{ id: tipos['Apartamento'] }] } } }),
  ])

  // ═══════════════════════════════════════════
  // PERFIS DE BUSCA — Belo Horizonte (5)
  // ═══════════════════════════════════════════
  const pBH = await Promise.all([
    prisma.perfilBusca.create({ data: { clienteNome: 'Ana Luiza Martins', clienteEmail: 'analuiza.m@gmail.com',         clienteWhatsapp: '+5531991110001', finalidade: Finalidade.VENDA,   precoMin: 400000,  precoMax: 700000,   areaMin: 70,  quartosMin: 2, cidades: ['Belo Horizonte'], bairros: ['Savassi', 'Funcionários', 'Lourdes'],           tenantId: tenantBH.id, tipos: { connect: [{ id: tipos['Apartamento'] }] } } }),
    prisma.perfilBusca.create({ data: { clienteNome: 'Pedro Henrique',    clienteEmail: 'pedrohenrique@hotmail.com',    clienteWhatsapp: '+5531991110002', finalidade: Finalidade.ALUGUEL, precoMin: 1800,    precoMax: 3000,     areaMin: 40,  quartosMin: 1, cidades: ['Belo Horizonte'], bairros: ['Lourdes', 'Funcionários', 'Savassi'],           tenantId: tenantBH.id, tipos: { connect: [{ id: tipos['Apartamento'] }] } } }),
    prisma.perfilBusca.create({ data: { clienteNome: 'Família Rocha',     clienteEmail: 'rocha.familia@yahoo.com.br',   clienteWhatsapp: '+5531991110003', finalidade: Finalidade.VENDA,   precoMin: 1500000, precoMax: 2500000,  areaMin: 280, quartosMin: 4, cidades: ['Belo Horizonte'], bairros: ['Mangabeiras', 'Belvedere'],                     tenantId: tenantBH.id, tipos: { connect: [{ id: tipos['Casa'] }] } } }),
    prisma.perfilBusca.create({ data: { clienteNome: 'Comércio Rápido',   clienteEmail: 'imoveis@comerciorapido.com.br',                                   finalidade: Finalidade.ALUGUEL, precoMin: 3000,    precoMax: 6000,     areaMin: 50,               cidades: ['Belo Horizonte'], bairros: ['Centro', 'Barreiro', 'Buritis'],                tenantId: tenantBH.id, tipos: { connect: [{ id: tipos['Comercial'] }] } } }),
    prisma.perfilBusca.create({ data: { clienteNome: 'Camila Borges',     clienteEmail: 'camila.borges@gmail.com',      clienteWhatsapp: '+5531991110005', finalidade: Finalidade.VENDA,   precoMin: 400000,  precoMax: 600000,   areaMin: 65,  quartosMin: 2, cidades: ['Belo Horizonte'], bairros: ['Buritis', 'Belvedere', 'Savassi'],              tenantId: tenantBH.id, tipos: { connect: [{ id: tipos['Apartamento'] }] } } }),
  ])

  // ═══════════════════════════════════════════
  // PERFIS DE BUSCA — Ipatinga (5)
  // ═══════════════════════════════════════════
  const pIPA = await Promise.all([
    prisma.perfilBusca.create({ data: { clienteNome: 'Anderson Rodrigues',clienteEmail: 'anderson.r@gmail.com',         clienteWhatsapp: '+553138221001',  finalidade: Finalidade.VENDA,   precoMin: 250000,  precoMax: 450000,   areaMin: 70,  quartosMin: 2, cidades: ['Ipatinga'], bairros: ['Cidade Nobre', 'Bom Retiro', 'Iguaçu'],         tenantId: tenantIPA.id, tipos: { connect: [{ id: tipos['Apartamento'] }] } } }),
    prisma.perfilBusca.create({ data: { clienteNome: 'Patrícia Oliveira', clienteEmail: 'patricia.oliveira@hotmail.com',clienteWhatsapp: '+553138221002',  finalidade: Finalidade.ALUGUEL, precoMin: 800,     precoMax: 1600,     areaMin: 50,  quartosMin: 2, cidades: ['Ipatinga'], bairros: ['Horto', 'Bom Retiro', 'Iguaçu'],                tenantId: tenantIPA.id, tipos: { connect: [{ id: tipos['Apartamento'] }, { id: tipos['Casa'] }] } } }),
    prisma.perfilBusca.create({ data: { clienteNome: 'Família Gonçalves', clienteEmail: 'jose.goncalves@yahoo.com.br',  clienteWhatsapp: '+553138221003',  finalidade: Finalidade.VENDA,   precoMin: 450000,  precoMax: 700000,   areaMin: 200, quartosMin: 4, cidades: ['Ipatinga'], bairros: ['Veneza', 'Cidade Nobre'],                        tenantId: tenantIPA.id, tipos: { connect: [{ id: tipos['Casa'] }] } } }),
    prisma.perfilBusca.create({ data: { clienteNome: 'Marcos Vieira',     clienteEmail: 'marcos.vieira@empresa.com',                                       finalidade: Finalidade.ALUGUEL, precoMin: 1500,    precoMax: 3500,     areaMin: 40,               cidades: ['Ipatinga', 'Coronel Fabriciano'],                                           tenantId: tenantIPA.id, tipos: { connect: [{ id: tipos['Comercial'] }] } } }),
    prisma.perfilBusca.create({ data: { clienteNome: 'Fernanda Duarte',   clienteEmail: 'fe.duarte@gmail.com',          clienteWhatsapp: '+553138221005',  finalidade: Finalidade.VENDA,   precoMin: 200000,  precoMax: 320000,   areaMin: 100, quartosMin: 3, cidades: ['Coronel Fabriciano', 'Timóteo'],                                            tenantId: tenantIPA.id, tipos: { connect: [{ id: tipos['Casa'] }] } } }),
  ])
  console.log(`   ✅ ${pSP.length + pBH.length + pIPA.length} perfis de busca criados`)

  // ═══════════════════════════════════════════
  // MATCHES
  // ═══════════════════════════════════════════
  console.log('\n💡 Gerando matches...')
  const matches = await Promise.all([
    // São Paulo
    prisma.match.create({ data: { perfilId: pSP[0].id, imovelId: iSP[5].id,  tenantId: tenantSP.id,  status: StatusMatch.INTERESSADO } }),   // Carlos → Brooklin
    prisma.match.create({ data: { perfilId: pSP[0].id, imovelId: iSP[9].id,  tenantId: tenantSP.id,  status: StatusMatch.VISUALIZADO } }),   // Carlos → Tatuapé
    prisma.match.create({ data: { perfilId: pSP[1].id, imovelId: iSP[0].id,  tenantId: tenantSP.id,  status: StatusMatch.INTERESSADO } }),   // Mariana → Pinheiros
    prisma.match.create({ data: { perfilId: pSP[1].id, imovelId: iSP[4].id,  tenantId: tenantSP.id,  status: StatusMatch.NOTIFICADO } }),    // Mariana → Vila Madalena
    prisma.match.create({ data: { perfilId: pSP[2].id, imovelId: iSP[3].id,  tenantId: tenantSP.id,  status: StatusMatch.EM_NEGOCIACAO } }), // TechCorp → Itaim
    prisma.match.create({ data: { perfilId: pSP[2].id, imovelId: iSP[8].id,  tenantId: tenantSP.id,  status: StatusMatch.NOTIFICADO } }),    // TechCorp → Jardins
    prisma.match.create({ data: { perfilId: pSP[3].id, imovelId: iSP[2].id,  tenantId: tenantSP.id,  status: StatusMatch.INTERESSADO } }),   // Roberto → Alto Pinheiros
    prisma.match.create({ data: { perfilId: pSP[4].id, imovelId: iSP[7].id,  tenantId: tenantSP.id,  status: StatusMatch.FECHADO } }),       // Letícia → Vila Olímpia
    prisma.match.create({ data: { perfilId: pSP[4].id, imovelId: iSP[1].id,  tenantId: tenantSP.id,  status: StatusMatch.VISUALIZADO } }),   // Letícia → Moema

    // Belo Horizonte
    prisma.match.create({ data: { perfilId: pBH[0].id, imovelId: iBH[0].id,  tenantId: tenantBH.id,  status: StatusMatch.INTERESSADO } }),   // Ana Luiza → Savassi
    prisma.match.create({ data: { perfilId: pBH[0].id, imovelId: iBH[6].id,  tenantId: tenantBH.id,  status: StatusMatch.NOTIFICADO } }),    // Ana Luiza → Belvedere 2Q
    prisma.match.create({ data: { perfilId: pBH[1].id, imovelId: iBH[1].id,  tenantId: tenantBH.id,  status: StatusMatch.VISUALIZADO } }),   // Pedro → Funcionários
    prisma.match.create({ data: { perfilId: pBH[1].id, imovelId: iBH[4].id,  tenantId: tenantBH.id,  status: StatusMatch.NOTIFICADO } }),    // Pedro → Lourdes
    prisma.match.create({ data: { perfilId: pBH[2].id, imovelId: iBH[2].id,  tenantId: tenantBH.id,  status: StatusMatch.EM_NEGOCIACAO } }), // Família Rocha → Mangabeiras
    prisma.match.create({ data: { perfilId: pBH[3].id, imovelId: iBH[3].id,  tenantId: tenantBH.id,  status: StatusMatch.INTERESSADO } }),   // Comércio → Centro
    prisma.match.create({ data: { perfilId: pBH[4].id, imovelId: iBH[6].id,  tenantId: tenantBH.id,  status: StatusMatch.INTERESSADO } }),   // Camila → Belvedere 2Q

    // Ipatinga
    prisma.match.create({ data: { perfilId: pIPA[0].id, imovelId: iIPA[6].id, tenantId: tenantIPA.id, status: StatusMatch.INTERESSADO } }),  // Anderson → Iguaçu
    prisma.match.create({ data: { perfilId: pIPA[0].id, imovelId: iIPA[0].id, tenantId: tenantIPA.id, status: StatusMatch.VISUALIZADO } }),  // Anderson → Cidade Nobre
    prisma.match.create({ data: { perfilId: pIPA[1].id, imovelId: iIPA[2].id, tenantId: tenantIPA.id, status: StatusMatch.INTERESSADO } }),  // Patrícia → Bom Retiro
    prisma.match.create({ data: { perfilId: pIPA[1].id, imovelId: iIPA[4].id, tenantId: tenantIPA.id, status: StatusMatch.NOTIFICADO } }),   // Patrícia → Horto
    prisma.match.create({ data: { perfilId: pIPA[2].id, imovelId: iIPA[5].id, tenantId: tenantIPA.id, status: StatusMatch.EM_NEGOCIACAO } }), // Família Gonçalves → Veneza
    prisma.match.create({ data: { perfilId: pIPA[3].id, imovelId: iIPA[7].id, tenantId: tenantIPA.id, status: StatusMatch.INTERESSADO } }),  // Marcos → Cariru
    prisma.match.create({ data: { perfilId: pIPA[4].id, imovelId: iIPA[8].id, tenantId: tenantIPA.id, status: StatusMatch.FECHADO } }),      // Fernanda → Coronel Fab.
  ])
  console.log(`   ✅ ${matches.length} matches gerados`)

  // Marcar imóvel da Letícia como VENDIDO
  await prisma.imovel.update({ where: { id: iSP[7].id }, data: { status: StatusImovel.VENDIDO } })

  console.log('\n🎉 Seed concluído!\n')
  console.log('═══════════════════════════════════════════════════════')
  console.log('  ACESSOS DAS IMOBILIÁRIAS')
  console.log('═══════════════════════════════════════════════════════')
  console.log('\n🏙️  PAULISTA IMÓVEIS — São Paulo/SP')
  console.log('   E-mail : admin@paulistaimoveis.com.br')
  console.log('   Senha  : Imov@2025')
  console.log('\n🏛️  BH PREMIUM IMÓVEIS — Belo Horizonte/MG')
  console.log('   E-mail : admin@bhpremium.com.br')
  console.log('   Senha  : Imov@2025')
  console.log('\n🏗️  VALE DO AÇO IMÓVEIS — Ipatinga/MG')
  console.log('   E-mail : admin@valeacoimoveis.com.br')
  console.log('   Senha  : Imov@2025')
  console.log('\n═══════════════════════════════════════════════════════')
  console.log(`  30 imóveis · 15 perfis · ${matches.length} matches`)
  console.log('═══════════════════════════════════════════════════════\n')
}

main()
  .catch((e) => { console.error('❌ Erro no seed:', e); process.exit(1) })
  .finally(() => prisma.$disconnect())
