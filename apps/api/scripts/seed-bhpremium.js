/**
 * Seed — BH Premium Imóveis
 * Tenant: cmpncy6qe0007mawo7qwkt6be
 *
 * Executa com:  node scripts/seed-bhpremium.js
 */
const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()
const TENANT   = 'cmpncy6qe0007mawo7qwkt6be'
const SENHA    = 'bh123456'
const ROUNDS   = 10

// ── IDs conhecidos ────────────────────────────────────────────────────────────
const TIPOS = {
  Apartamento: 'cmpncy1ln0000mawohxcvok94',
  Casa:        'cmpncy2p00001mawojmikkt5x',
  Comercial:   'cmpncy3c80002mawohwj1pds8',
  Terreno:     'cmpncy47e0003mawoijtx3ee3',
}

const CIDADES = {
  'Belo Horizonte': 3106200,
  'Contagem':       3118601,
  'Nova Lima':      3144805,
  'Betim':          3106705,
}

const ETAPAS = [
  '28bb3193-e2ec-452a-9bbf-79fa4c442576', // Novo
  'a681228c-6cd2-4cce-970b-f60e697fdaf5', // Contatado
  'a94236c2-5c58-46cf-b6bf-d5051221d883', // Visita Agendada
  '5b5ac1e8-4707-46f3-9f7c-8edccb776690', // Em Negociação
  'e3285952-02e3-4728-83bd-b0999ecf5c27', // Fechado
  'a8351c23-e2eb-4d83-9ebe-c38219ab0d03', // Encerrado
]

// ── Helpers ───────────────────────────────────────────────────────────────────
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)] }
function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min }
function randDec(min, max) { return +(Math.random() * (max - min) + min).toFixed(2) }

// ── Dados dos bairros por cidade ──────────────────────────────────────────────
const BAIRROS = {
  'Belo Horizonte': [
    { nome: 'Savassi',           nivel: 'premium' },
    { nome: 'Funcionários',      nivel: 'premium' },
    { nome: 'Lourdes',           nivel: 'premium' },
    { nome: 'Belvedere',         nivel: 'premium' },
    { nome: 'Mangabeiras',       nivel: 'premium' },
    { nome: 'Gutierrez',         nivel: 'premium' },
    { nome: 'Anchieta',          nivel: 'premium' },
    { nome: 'São Pedro',         nivel: 'premium' },
    { nome: 'Sion',              nivel: 'premium' },
    { nome: 'Serra',             nivel: 'premium' },
    { nome: 'Buritis',           nivel: 'medio'   },
    { nome: 'Pampulha',          nivel: 'medio'   },
    { nome: 'Floresta',          nivel: 'medio'   },
    { nome: 'Santa Teresa',      nivel: 'medio'   },
    { nome: 'Caiçara',           nivel: 'medio'   },
    { nome: 'Coração Eucarístico', nivel: 'medio' },
    { nome: 'Cidade Nova',       nivel: 'medio'   },
    { nome: 'Serrano',           nivel: 'medio'   },
    { nome: 'Carlos Prates',     nivel: 'medio'   },
    { nome: 'Luxemburgo',        nivel: 'medio'   },
    { nome: 'Barreiro',          nivel: 'popular' },
    { nome: 'Venda Nova',        nivel: 'popular' },
    { nome: 'Palmares',          nivel: 'popular' },
    { nome: 'Heliópolis',        nivel: 'popular' },
    { nome: 'Jardim América',    nivel: 'popular' },
  ],
  'Contagem': [
    { nome: 'Eldorado',           nivel: 'medio'   },
    { nome: 'Cidade Industrial',  nivel: 'medio'   },
    { nome: 'Nacional',           nivel: 'medio'   },
    { nome: 'Novo Riacho',        nivel: 'popular' },
    { nome: 'Ressaca',            nivel: 'popular' },
    { nome: 'Jardim Industrial',  nivel: 'popular' },
    { nome: 'Petrolândia',        nivel: 'medio'   },
  ],
  'Nova Lima': [
    { nome: 'Vila da Serra',   nivel: 'premium' },
    { nome: 'Alphaville',      nivel: 'premium' },
    { nome: 'Jardim Canadá',   nivel: 'premium' },
    { nome: 'Mury',            nivel: 'medio'   },
    { nome: 'Centro',          nivel: 'medio'   },
  ],
  'Betim': [
    { nome: 'Centro',              nivel: 'medio'   },
    { nome: 'Citrolândia',         nivel: 'medio'   },
    { nome: 'Jardim das Alterosas',nivel: 'medio'   },
    { nome: 'PTB',                 nivel: 'popular' },
    { nome: 'Imbiruçu',            nivel: 'popular' },
    { nome: 'Jardim Teresópolis',  nivel: 'popular' },
  ],
}

function gerarPreco(nivel, finalidade, tipo) {
  if (finalidade === 'ALUGUEL') {
    if (tipo === 'Comercial')  return randDec(2000, 12000)
    if (tipo === 'Terreno')    return randDec(800, 4000)
    if (nivel === 'premium')   return randDec(2500, 12000)
    if (nivel === 'medio')     return randDec(1000, 3500)
    return randDec(600, 1800)
  }
  // VENDA
  if (tipo === 'Terreno') {
    if (nivel === 'premium') return randDec(400000, 1800000)
    if (nivel === 'medio')   return randDec(120000, 500000)
    return randDec(60000, 200000)
  }
  if (tipo === 'Comercial') {
    if (nivel === 'premium') return randDec(600000, 3000000)
    if (nivel === 'medio')   return randDec(200000, 800000)
    return randDec(80000, 300000)
  }
  if (nivel === 'premium')   return randDec(550000, 3500000)
  if (nivel === 'medio')     return randDec(200000, 750000)
  return randDec(100000, 350000)
}

function gerarTitulo(tipo, quartos, bairro, finalidade) {
  if (tipo === 'Terreno') return `Terreno ${finalidade === 'VENDA' ? 'à venda' : 'para locação'} no ${bairro}`
  if (tipo === 'Comercial') {
    const sub = pick(['Sala Comercial', 'Loja', 'Galpão', 'Escritório', 'Ponto Comercial'])
    return `${sub} ${finalidade === 'VENDA' ? 'à venda' : 'para locação'} no ${bairro}`
  }
  const qStr = quartos === 1 ? '1 quarto' : `${quartos} quartos`
  const acao = finalidade === 'VENDA' ? 'à venda' : 'para alugar'
  return `${tipo} ${qStr} ${acao} no ${bairro}`
}

// ── Perfis de busca ───────────────────────────────────────────────────────────
const CLIENTES = [
  { nome: 'Ana Paula Ferreira',   email: 'anapaula@email.com',   wpp: '(31) 98811-0001' },
  { nome: 'Bruno Carvalho',       email: 'brunocarv@email.com',  wpp: '(31) 99922-0002' },
  { nome: 'Camila Souza',         email: 'camilasouza@email.com',wpp: '(31) 98733-0003' },
  { nome: 'Daniel Matos',         email: 'danielm@email.com',    wpp: '(31) 99644-0004' },
  { nome: 'Eliane Costa',         email: 'elianec@email.com',    wpp: '(31) 98555-0005' },
  { nome: 'Felipe Rocha',         email: 'feliperocha@email.com',wpp: '(31) 99466-0006' },
  { nome: 'Gabriela Lima',        email: 'gabslima@email.com',   wpp: '(31) 98377-0007' },
  { nome: 'Henrique Alves',       email: 'henriquea@email.com',  wpp: '(31) 99288-0008' },
  { nome: 'Isabela Martins',      email: 'isabelam@email.com',   wpp: '(31) 98199-0009' },
  { nome: 'João Pedro Silva',     email: 'joaopedro@email.com',  wpp: '(31) 99010-0010' },
  { nome: 'Karen Nunes',          email: 'karennunes@email.com', wpp: '(31) 98921-0011' },
  { nome: 'Lucas Pereira',        email: 'lucaspereira@email.com',wpp:'(31) 99832-0012' },
  { nome: 'Mariana Gomes',        email: 'marianag@email.com',   wpp: '(31) 98743-0013' },
  { nome: 'Nathalia Ramos',       email: 'nathaliar@email.com',  wpp: '(31) 99654-0014' },
  { nome: 'Otávio Ribeiro',       email: 'otaviorib@email.com',  wpp: '(31) 98565-0015' },
  { nome: 'Patricia Dias',        email: 'patriciad@email.com',  wpp: '(31) 99476-0016' },
  { nome: 'Rafael Cunha',         email: 'rafaelcunha@email.com',wpp: '(31) 98387-0017' },
  { nome: 'Samara Oliveira',      email: 'samaraoliveira@email.com',wpp:'(31) 99298-0018'},
  { nome: 'Thiago Barbosa',       email: 'thiagob@email.com',    wpp: '(31) 98209-0019' },
  { nome: 'Vanessa Castro',       email: 'vanessacastro@email.com',wpp:'(31) 99110-0020' },
  { nome: 'William Fernandes',    email: 'williamf@email.com',   wpp: '(31) 98021-0021' },
  { nome: 'Xuxa Moreira',         email: 'xuxam@email.com',      wpp: '(31) 99932-0022' },
  { nome: 'Yara Santos',          email: 'yarasantos@email.com', wpp: '(31) 98843-0023' },
  { nome: 'Zoe Cardoso',          email: 'zoecardoso@email.com', wpp: '(31) 99754-0024' },
  { nome: 'Alexandre Teixeira',   email: 'alexandret@email.com', wpp: '(31) 98665-0025' },
  { nome: 'Beatriz Freitas',      email: 'beatrizf@email.com',   wpp: '(31) 99576-0026' },
  { nome: 'Carlos Mendes',        email: 'carlosm@email.com',    wpp: '(31) 98487-0027' },
  { nome: 'Denise Azevedo',       email: 'denisea@email.com',    wpp: '(31) 99398-0028' },
  { nome: 'Eduardo Pinto',        email: 'eduardop@email.com',   wpp: '(31) 98309-0029' },
  { nome: 'Fernanda Leal',        email: 'fernandaleal@email.com',wpp:'(31) 99210-0030' },
]

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  const hash = await bcrypt.hash(SENHA, ROUNDS)

  // 1. Atualizar senha do corretor1
  const c1 = await prisma.user.findFirst({ where: { tenantId: TENANT, email: 'corretor1@bhpremium.com.br' } })
  if (c1) {
    await prisma.user.update({ where: { id: c1.id }, data: { passwordHash: hash } })
    console.log('✅ Senha de corretor1 atualizada')
  }

  // 2. Criar corretor2 e corretor3
  const corrData = [
    { name: 'Corretor Dois',  email: 'corretor2@bhpremium.com.br' },
    { name: 'Corretor Três',  email: 'corretor3@bhpremium.com.br' },
  ]
  const novosCorretores = []
  for (const cd of corrData) {
    const exists = await prisma.user.findFirst({ where: { email: cd.email } })
    if (exists) {
      await prisma.user.update({ where: { id: exists.id }, data: { passwordHash: hash } })
      novosCorretores.push(exists)
      console.log(`✅ ${cd.email} já existe — senha atualizada`)
    } else {
      const u = await prisma.user.create({
        data: { name: cd.name, email: cd.email, passwordHash: hash, role: 'CORRETOR', tenantId: TENANT, ativo: true },
      })
      novosCorretores.push(u)
      console.log(`✅ Criado: ${cd.email}`)
    }
  }

  // Montar lista completa de corretores (c1 + novos)
  const allCorretores = [c1, ...novosCorretores].filter(Boolean)
  const corretorIds = allCorretores.map(c => c.id)
  console.log(`\n📋 Corretores disponíveis: ${corretorIds.length}`)

  // 3. Criar 94 imóveis
  console.log('\n🏠 Criando 94 imóveis...')

  const tiposNomes = ['Apartamento', 'Apartamento', 'Apartamento', 'Casa', 'Casa', 'Comercial', 'Terreno']
  const finalidades = ['VENDA', 'VENDA', 'VENDA', 'ALUGUEL', 'ALUGUEL']

  const cidadesDistrib = [
    ...Array(50).fill('Belo Horizonte'),
    ...Array(18).fill('Contagem'),
    ...Array(14).fill('Nova Lima'),
    ...Array(12).fill('Betim'),
  ]

  const imoveisData = []
  for (let i = 0; i < 94; i++) {
    const cidade    = cidadesDistrib[i]
    const bairroObj = pick(BAIRROS[cidade])
    const tipoNome  = pick(tiposNomes)
    const finalidade = pick(finalidades)
    const preco     = gerarPreco(bairroObj.nivel, finalidade, tipoNome)
    const quartos   = tipoNome === 'Terreno' ? null : tipoNome === 'Comercial' ? null : rand(1, 5)
    const banheiros = quartos ? rand(1, Math.min(quartos, 4)) : null
    const vagas     = tipoNome === 'Terreno' ? null : rand(0, 3)
    const areaM2    = tipoNome === 'Terreno'
      ? randDec(200, 1500)
      : tipoNome === 'Comercial' ? randDec(30, 600) : randDec(45, 350)

    imoveisData.push({
      titulo:     gerarTitulo(tipoNome, quartos, bairroObj.nome, finalidade),
      tipoId:     TIPOS[tipoNome],
      finalidade,
      preco,
      areaM2,
      quartos,
      banheiros,
      vagas,
      bairro:     bairroObj.nome,
      cidadeId:   CIDADES[cidade],
      estado:     'MG',
      status:     'DISPONIVEL',
      origem:     'manual',
      tenantId:   TENANT,
    })
  }

  const imoveisIds = []
  for (const data of imoveisData) {
    const im = await prisma.imovel.create({ data })
    imoveisIds.push(im.id)
  }
  console.log(`✅ ${imoveisIds.length} imóveis criados`)

  // 4. Criar 30 perfis de busca
  console.log('\n👤 Criando 30 perfis de busca...')
  const tiposArr = Object.values(TIPOS)
  const perfisIds = []
  for (const cli of CLIENTES) {
    const qtdTipos = rand(1, 3)
    const tiposSelecionados = []
    const shuffled = [...tiposArr].sort(() => Math.random() - 0.5)
    for (let t = 0; t < qtdTipos; t++) tiposSelecionados.push({ id: shuffled[t] })

    const finalidade = pick(['VENDA', 'ALUGUEL'])
    const precoBase = randDec(150000, 2000000)
    const precoMin  = Math.max(0, precoBase * 0.7)
    const precoMax  = precoBase * 1.3

    const p = await prisma.perfilBusca.create({
      data: {
        clienteNome:    cli.nome,
        clienteEmail:   cli.email,
        clienteWhatsapp: cli.wpp,
        finalidade,
        precoMin,
        precoMax,
        quartosMin:  rand(1, 3),
        areaMin:     randDec(40, 120),
        tenantId:    TENANT,
        tipos:       { connect: tiposSelecionados },
      },
    })
    perfisIds.push(p.id)
  }
  console.log(`✅ ${perfisIds.length} perfis criados`)

  // 5. Criar matches entre perfis e imóveis
  // Todos os 104 imóveis (10 existentes + 94 novos)
  // 10 ficam sem match/corretor (escolhidos aleatoriamente)
  console.log('\n🔗 Criando matches...')

  const todosImoveis = await prisma.imovel.findMany({
    where: { tenantId: TENANT },
    select: { id: true },
  })
  const todosImoveisIds = todosImoveis.map(i => i.id)

  // Escolher 10 imóveis que ficam SEM corretor (sem match com corretor)
  const shuffledImoveis = [...todosImoveisIds].sort(() => Math.random() - 0.5)
  const semCorretor = new Set(shuffledImoveis.slice(0, 10))

  let matchCount = 0
  // Para cada imóvel com corretor, criar 1-2 matches
  for (const imovelId of todosImoveisIds) {
    if (semCorretor.has(imovelId)) continue

    const qtdMatches = rand(1, 2)
    const shuffledPerfis = [...perfisIds].sort(() => Math.random() - 0.5)

    for (let m = 0; m < qtdMatches; m++) {
      const perfilId   = shuffledPerfis[m]
      const etapaId    = pick(ETAPAS)
      const corretorId = pick(corretorIds)

      // Verifica se match já existe
      const existe = await prisma.match.findFirst({ where: { imovelId, perfilId } })
      if (existe) continue

      await prisma.match.create({
        data: {
          imovelId,
          perfilId,
          etapaId,
          corretorId,
          tenantId: TENANT,
        },
      })
      matchCount++
    }
  }
  console.log(`✅ ${matchCount} matches criados`)
  console.log(`✅ 10 imóveis sem corretor (conforme solicitado)`)

  // Resumo final
  const totalIm  = await prisma.imovel.count({ where: { tenantId: TENANT } })
  const totalPer = await prisma.perfilBusca.count({ where: { tenantId: TENANT } })
  const totalMat = await prisma.match.count({ where: { tenantId: TENANT } })
  const totalUsr = await prisma.user.count({ where: { tenantId: TENANT } })

  console.log('\n══════════════════════════════════════')
  console.log(`📊 BH Premium — resumo final:`)
  console.log(`   Usuários:  ${totalUsr}  (1 admin + ${totalUsr - 1} corretores)`)
  console.log(`   Imóveis:   ${totalIm}`)
  console.log(`   Perfis:    ${totalPer}`)
  console.log(`   Matches:   ${totalMat}`)
  console.log('══════════════════════════════════════')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
