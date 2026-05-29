/**
 * Seed: 50 clientes com perfis e matches — BH Premium Imóveis
 * Uso: node scripts/seed-clientes-bhpremium.js
 */

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

// ─── IDs fixos do tenant ────────────────────────────────────────────────────
const TENANT_ID = 'cmpncy6qe0007mawo7qwkt6be'

const CORRETORES = [
  { id: 'cmppk0fit0001t71wteg36idv',  nome: 'Tiago Lana'     },
  { id: 'cmppmir5a0001ma9kd4ds6fui',  nome: 'Corretor Dois'  },
  { id: 'cmppmir810003ma9k4fk0w5fs',  nome: 'Corretor Três'  },
]

const TIPOS = {
  APARTAMENTO: 'cmpncy1ln0000mawohxcvok94',
  CASA:        'cmpncy2p00001mawojmikkt5x',
  COMERCIAL:   'cmpncy3c80002mawohwj1pds8',
  TERRENO:     'cmpncy47e0003mawoijtx3ee3',
}

const ETAPAS = {
  NOVO:           '28bb3193-e2ec-452a-9bbf-79fa4c442576',
  CONTATADO:      'a681228c-6cd2-4cce-970b-f60e697fdaf5',
  VISITA_AGEND:   'a94236c2-5c58-46cf-b6bf-d5051221d883',
  EM_NEGOCIACAO:  '5b5ac1e8-4707-46f3-9f7c-8edccb776690',
  FECHADO:        'e3285952-02e3-4728-83bd-b0999ecf5c27',
  ENCERRADO:      'a8351c23-e2eb-4d83-9ebe-c38219ab0d03',
}

// Peso para distribuição realista do pipeline
const ETAPA_POOL = [
  ETAPAS.NOVO,         ETAPAS.NOVO,         ETAPAS.NOVO,
  ETAPAS.CONTATADO,    ETAPAS.CONTATADO,    ETAPAS.CONTATADO,
  ETAPAS.VISITA_AGEND, ETAPAS.VISITA_AGEND,
  ETAPAS.EM_NEGOCIACAO,
  ETAPAS.FECHADO,
  ETAPAS.ENCERRADO,
]

// ─── Dados dos clientes ─────────────────────────────────────────────────────
const CLIENTES_DATA = [
  // Sem corretor (5)
  { nome: 'Amanda Ferreira Santos',   email: 'amanda.ferreira@gmail.com',   whatsapp: '+5531998001001', cpf: '123.456.789-00', observacoes: 'Interessada em apartamentos no Centro ou Savassi. Prefere andar alto.' },
  { nome: 'Bruno Carvalho Mendes',    email: 'bruno.carvalho@hotmail.com',  whatsapp: '+5531998001002', cpf: '234.567.890-01', observacoes: 'Busca imóvel para investimento. Foco em renda de aluguel.' },
  { nome: 'Catarina Lima Peixoto',    email: 'catarina.lima@yahoo.com.br',  whatsapp: '+5531998001003', cpf: '345.678.901-02', observacoes: 'Casal jovem, primeiro imóvel. Precisa de financiamento.' },
  { nome: 'Diego Nascimento Rocha',   email: 'diego.nascimento@gmail.com',  whatsapp: '+5531998001004', cpf: '456.789.012-03', observacoes: 'Executivo transferido de SP. Prefere condomínio com segurança.' },
  { nome: 'Elaine Gonçalves Mota',    email: 'elaine.goncalves@outlook.com',whatsapp: '+5531998001005', cpf: '567.890.123-04', observacoes: 'Procura casa para família com 3 filhos. Escola próxima é prioridade.' },

  // Tiago Lana — 15 clientes
  { nome: 'Felipe Augusto Teixeira',  email: 'felipe.teixeira@gmail.com',   whatsapp: '+5531998002001', cpf: '678.901.234-05', observacoes: 'Prefere Buritis ou Gutierrez. Carro na garagem é essencial.' },
  { nome: 'Gabriela Souza Nunes',     email: 'gabriela.souza@gmail.com',    whatsapp: '+5531998002002', cpf: '789.012.345-06', observacoes: 'Mudança para BH a trabalho. Quer alugar por 1 ano inicialmente.' },
  { nome: 'Henrique Barbosa Costa',   email: 'henrique.barbosa@icloud.com', whatsapp: '+5531998002003', cpf: '890.123.456-07', observacoes: 'Médico, busca apartamento grande no Belvedere ou Mangabeiras.' },
  { nome: 'Isabela Rodrigues Alves',  email: 'isabela.rodrigues@gmail.com', whatsapp: '+5531998002004', cpf: '901.234.567-08', observacoes: 'Investidora. Quer 2 apartamentos compactos para locação.' },
  { nome: 'João Pedro Martins',       email: 'joao.martins@gmail.com',      whatsapp: '+5531998002005', cpf: '012.345.678-09', observacoes: 'Recém-casado. Orçamento até 500k. Não abre mão de área de lazer.' },
  { nome: 'Karen Oliveira Prado',     email: 'karen.oliveira@hotmail.com',  whatsapp: '+5531998002006', cpf: '111.222.333-44', observacoes: 'Professora universitária. Quer morar próximo à PUC Minas.' },
  { nome: 'Lucas Ferreira Dias',      email: 'lucas.ferreira@gmail.com',    whatsapp: '+5531998002007', cpf: '222.333.444-55', observacoes: 'Empreendedor. Precisa de sala comercial e apartamento.' },
  { nome: 'Mariana Castro Velho',     email: 'mariana.castro@gmail.com',    whatsapp: '+5531998002008', cpf: '333.444.555-66', observacoes: 'Aposentada. Quer apartamento térreo ou com elevador. Até 400k.' },
  { nome: 'Nathalia Pereira Duarte',  email: 'nathalia.pereira@gmail.com',  whatsapp: '+5531998002009', cpf: '444.555.666-77', observacoes: 'Estudante de medicina. Busca quitinete ou 1 quarto para alugar.' },
  { nome: 'Otávio Ramos Cunha',       email: 'otavio.ramos@gmail.com',      whatsapp: '+5531998002010', cpf: '555.666.777-88', observacoes: 'Família com 2 filhos adolescentes. Quer casa com quintal.' },
  { nome: 'Patrícia Leal Fonseca',    email: 'patricia.leal@gmail.com',     whatsapp: '+5531998002011', cpf: '666.777.888-99', observacoes: 'Gerente de banco. Imóvel para moradia e escritório em casa.' },
  { nome: 'Rodrigo Sousa Pinheiro',   email: 'rodrigo.sousa@gmail.com',     whatsapp: '+5531998002012', cpf: '777.888.999-00', observacoes: 'Arquiteto. Prefere imóveis com potencial de reforma.' },
  { nome: 'Sabrina Moura Braga',      email: 'sabrina.moura@outlook.com',   whatsapp: '+5531998002013', cpf: '888.999.000-11', observacoes: 'Solteira, 30 anos. Quer apartamento moderno no Funcionários.' },
  { nome: 'Thiago Andrade Lima',      email: 'thiago.andrade@gmail.com',    whatsapp: '+5531998002014', cpf: '999.000.111-22', observacoes: 'Corretor de seguros. Busca ponto comercial ou conjunto.' },
  { nome: 'Ursula Campos Freitas',    email: 'ursula.campos@gmail.com',     whatsapp: '+5531998002015', cpf: '100.200.300-40', observacoes: 'Empresária. Tem urgência — mudança em 60 dias.' },

  // Corretor Dois — 15 clientes
  { nome: 'Vagner Ribeiro Assis',     email: 'vagner.ribeiro@gmail.com',    whatsapp: '+5531998003001', cpf: '200.300.400-50', observacoes: 'Ex-morador de BH, retornando. Quer casa no Jardim América.' },
  { nome: 'Waleska Torres Neves',     email: 'waleska.torres@gmail.com',    whatsapp: '+5531998003002', cpf: '300.400.500-60', observacoes: 'Mãe solo, 2 filhos. Procura casa ou apto com 3 quartos.' },
  { nome: 'Xavier Queiroz Bento',     email: 'xavier.queiroz@hotmail.com',  whatsapp: '+5531998003003', cpf: '400.500.600-70', observacoes: 'Investidor experiente. Quer imóvel comercial em boa localização.' },
  { nome: 'Yasmin Figueiredo Cruz',   email: 'yasmin.figueiredo@gmail.com', whatsapp: '+5531998003004', cpf: '500.600.700-80', observacoes: 'Influenciadora digital. Quer apartamento fotogênico no Savassi.' },
  { nome: 'Zuleide Batista Melo',     email: 'zuleide.batista@gmail.com',   whatsapp: '+5531998003005', cpf: '600.700.800-90', observacoes: 'Professora aposentada. Quer permuta de casa antiga por apartamento.' },
  { nome: 'Alexandre Paiva Lemos',    email: 'alexandre.paiva@gmail.com',   whatsapp: '+5531998003006', cpf: '700.800.900-01', observacoes: 'Engenheiro civil. Tem bom conhecimento técnico de imóveis.' },
  { nome: 'Beatriz Mendonça Neto',    email: 'beatriz.mendonca@gmail.com',  whatsapp: '+5531998003007', cpf: '800.900.001-12', observacoes: 'Advogada. Quer apartamento com home office.' },
  { nome: 'Cíntia Borges Araújo',     email: 'cintia.borges@gmail.com',     whatsapp: '+5531998003008', cpf: '900.001.002-23', observacoes: 'Designer. Prefere bairros com vida cultural — Lourdes, Savassi, BH.' },
  { nome: 'Danilo Vasconcelos Pires', email: 'danilo.vasconcelos@gmail.com',whatsapp: '+5531998003009', cpf: '001.002.003-34', observacoes: 'Empresário do setor de TI. Quer apartamento alto padrão.' },
  { nome: 'Edilene Marques Vianna',   email: 'edilene.marques@outlook.com', whatsapp: '+5531998003010', cpf: '002.003.004-45', observacoes: 'Farmacêutica. Quer casa condomínio fechado próximo ao Pampulha.' },
  { nome: 'Fernando Guimarães Luz',   email: 'fernando.guimaraes@gmail.com',whatsapp: '+5531998003011', cpf: '003.004.005-56', observacoes: 'Servidor público federal. Financiamento pelo BB já aprovado.' },
  { nome: 'Gisele Moreira Siqueira',  email: 'gisele.moreira@gmail.com',    whatsapp: '+5531998003012', cpf: '004.005.006-67', observacoes: 'Consultora RH. Quer imóvel que possa locar quartos por temporada.' },
  { nome: 'Hélio Tavares Magalhães',  email: 'helio.tavares@hotmail.com',   whatsapp: '+5531998003013', cpf: '005.006.007-78', observacoes: 'Comerciante. Precisa de imóvel comercial no Barreiro.' },
  { nome: 'Ingrid Cavalcante Porto',  email: 'ingrid.cavalcante@gmail.com', whatsapp: '+5531998003014', cpf: '006.007.008-89', observacoes: 'Fisioterapeuta. Quer clínica pequena em bairro nobre.' },
  { nome: 'Jefferson Cardoso Maia',   email: 'jefferson.cardoso@gmail.com', whatsapp: '+5531998003015', cpf: '007.008.009-90', observacoes: 'Auditor fiscal. Prefere Buritis, Gutierrez ou Anchieta.' },

  // Corretor Três — 15 clientes
  { nome: 'Kátia Drummond Rezende',   email: 'katia.drummond@gmail.com',    whatsapp: '+5531998004001', cpf: '008.009.010-01', observacoes: 'Decoradora de interiores. Busca apartamento para portfolio.' },
  { nome: 'Leonardo Abreu Silveira',  email: 'leonardo.abreu@gmail.com',    whatsapp: '+5531998004002', cpf: '009.010.011-12', observacoes: 'Dentista. Quer sala comercial de consultório no Lourdes.' },
  { nome: 'Michele Sampaio Corrêa',   email: 'michele.sampaio@gmail.com',   whatsapp: '+5531998004003', cpf: '010.011.012-23', observacoes: 'Nutricionista. Quer apartamento com varanda gourmet.' },
  { nome: 'Nelson Quaresma Leite',    email: 'nelson.quaresma@outlook.com', whatsapp: '+5531998004004', cpf: '011.012.013-34', observacoes: 'Piloto de avião. Quer algo moderno perto do Aeroporto Pampulha.' },
  { nome: 'Odete Ferreira Lacerda',   email: 'odete.ferreira@gmail.com',    whatsapp: '+5531998004005', cpf: '012.013.014-45', observacoes: 'Viúva, 65 anos. Quer apartamento menor em bairro tranquilo.' },
  { nome: 'Paulo Sérgio Teles Neto',  email: 'paulo.teles@gmail.com',       whatsapp: '+5531998004006', cpf: '013.014.015-56', observacoes: 'Gerente de vendas. Quer casa com 4 quartos no Caiçara.' },
  { nome: 'Queila Nogueira Bastos',   email: 'queila.nogueira@gmail.com',   whatsapp: '+5531998004007', cpf: '014.015.016-67', observacoes: 'Psicóloga. Quer sala compacta no Funcionários ou Savassi.' },
  { nome: 'Renato Cavalcanti Pinto',  email: 'renato.cavalcanti@gmail.com', whatsapp: '+5531998004008', cpf: '015.016.017-78', observacoes: 'Militar. Quer imóvel financiável pelo programa Casa Verde.' },
  { nome: 'Simone Loureiro Britto',   email: 'simone.loureiro@gmail.com',   whatsapp: '+5531998004009', cpf: '016.017.018-89', observacoes: 'Veterinária. Precisa que o condomínio aceite animais de grande porte.' },
  { nome: 'Tadeu Macedo Conceição',   email: 'tadeu.macedo@gmail.com',      whatsapp: '+5531998004010', cpf: '017.018.019-90', observacoes: 'Vereador. Quer imóvel discreto para uso pessoal.' },
  { nome: 'Úrsula Ávila Ferraz',      email: 'ursula.avila@outlook.com',    whatsapp: '+5531998004011', cpf: '018.019.020-01', observacoes: 'Jornalista. Quer apartamento pequeno mas bem localizado.' },
  { nome: 'Vitor Rangel Azevedo',     email: 'vitor.rangel@gmail.com',      whatsapp: '+5531998004012', cpf: '019.020.021-12', observacoes: 'Startupeiro. Quer espaço de coworking + moradia (live-work).' },
  { nome: 'Waldemar Cordeiro Faria',  email: 'waldemar.cordeiro@gmail.com', whatsapp: '+5531998004013', cpf: '020.021.022-23', observacoes: 'Produtor rural. Imóvel em BH para filho estudar medicina.' },
  { nome: 'Xênia Pacheco Esteves',    email: 'xenia.pacheco@gmail.com',     whatsapp: '+5531998004014', cpf: '021.022.023-34', observacoes: 'Chef de cozinha. Quer cozinha americana e varanda grande.' },
  { nome: 'Yolanda Gomes Saraiva',    email: 'yolanda.gomes@gmail.com',     whatsapp: '+5531998004015', cpf: '022.023.024-45', observacoes: 'Fissurada em tecnologia. Quer smart-home ou imóvel reformável.' },
]

// ─── Perfis por cliente ──────────────────────────────────────────────────────
// Cada perfil tem finalidade, tipoIds, precoMin, precoMax, quartosMin, cidades
const PERFIS_TEMPLATE = [
  // Perfis para clientes sem corretor (índices 0-4)
  [{ finalidade:'VENDA',   tipos:['APARTAMENTO'],           precoMin:400000,  precoMax:800000,  quartosMin:2, cidades:['Belo Horizonte'] }],
  [{ finalidade:'ALUGUEL', tipos:['APARTAMENTO','COMERCIAL'],precoMin:3000,    precoMax:6000,    quartosMin:null, cidades:['Belo Horizonte'] }, { finalidade:'VENDA', tipos:['APARTAMENTO'], precoMin:500000, precoMax:900000, quartosMin:2, cidades:['Belo Horizonte'] }],
  [{ finalidade:'VENDA',   tipos:['APARTAMENTO','CASA'],    precoMin:300000,  precoMax:550000,  quartosMin:2, cidades:['Belo Horizonte'] }],
  [{ finalidade:'VENDA',   tipos:['APARTAMENTO'],           precoMin:600000,  precoMax:1200000, quartosMin:3, cidades:['Belo Horizonte'] }],
  [{ finalidade:'VENDA',   tipos:['CASA'],                  precoMin:350000,  precoMax:650000,  quartosMin:3, cidades:['Belo Horizonte'] }],

  // Tiago Lana — índices 5-19
  [{ finalidade:'VENDA',   tipos:['APARTAMENTO','CASA'],    precoMin:400000,  precoMax:700000,  quartosMin:3, cidades:['Belo Horizonte'] }],
  [{ finalidade:'ALUGUEL', tipos:['APARTAMENTO'],           precoMin:1800,    precoMax:3500,    quartosMin:2, cidades:['Belo Horizonte'] }],
  [{ finalidade:'VENDA',   tipos:['APARTAMENTO'],           precoMin:900000,  precoMax:2000000, quartosMin:3, cidades:['Belo Horizonte'] }],
  [{ finalidade:'VENDA',   tipos:['APARTAMENTO'],           precoMin:250000,  precoMax:550000,  quartosMin:2, cidades:['Belo Horizonte'] }, { finalidade:'ALUGUEL', tipos:['APARTAMENTO'], precoMin:1500, precoMax:3000, quartosMin:1, cidades:['Belo Horizonte'] }],
  [{ finalidade:'VENDA',   tipos:['APARTAMENTO','CASA'],    precoMin:380000,  precoMax:500000,  quartosMin:2, cidades:['Belo Horizonte'] }],
  [{ finalidade:'VENDA',   tipos:['APARTAMENTO'],           precoMin:300000,  precoMax:480000,  quartosMin:2, cidades:['Belo Horizonte'] }],
  [{ finalidade:'VENDA',   tipos:['COMERCIAL'],             precoMin:300000,  precoMax:700000,  quartosMin:null, cidades:['Belo Horizonte'] }, { finalidade:'VENDA', tipos:['APARTAMENTO'], precoMin:450000, precoMax:750000, quartosMin:2, cidades:['Belo Horizonte'] }],
  [{ finalidade:'VENDA',   tipos:['APARTAMENTO','CASA'],    precoMin:280000,  precoMax:420000,  quartosMin:2, cidades:['Belo Horizonte'] }],
  [{ finalidade:'ALUGUEL', tipos:['APARTAMENTO'],           precoMin:1200,    precoMax:2400,    quartosMin:1, cidades:['Belo Horizonte'] }],
  [{ finalidade:'VENDA',   tipos:['CASA'],                  precoMin:400000,  precoMax:700000,  quartosMin:3, cidades:['Belo Horizonte'] }],
  [{ finalidade:'VENDA',   tipos:['APARTAMENTO'],           precoMin:500000,  precoMax:900000,  quartosMin:2, cidades:['Belo Horizonte'] }],
  [{ finalidade:'VENDA',   tipos:['APARTAMENTO'],           precoMin:350000,  precoMax:600000,  quartosMin:2, cidades:['Belo Horizonte'] }],
  [{ finalidade:'VENDA',   tipos:['COMERCIAL'],             precoMin:200000,  precoMax:500000,  quartosMin:null, cidades:['Belo Horizonte'] }],
  [{ finalidade:'ALUGUEL', tipos:['APARTAMENTO'],           precoMin:2000,    precoMax:4000,    quartosMin:2, cidades:['Belo Horizonte'] }],
  [{ finalidade:'VENDA',   tipos:['COMERCIAL','APARTAMENTO'],precoMin:400000, precoMax:800000,  quartosMin:null, cidades:['Belo Horizonte'] }],

  // Corretor Dois — índices 20-34
  [{ finalidade:'VENDA',   tipos:['CASA'],                  precoMin:350000,  precoMax:600000,  quartosMin:3, cidades:['Belo Horizonte'] }],
  [{ finalidade:'VENDA',   tipos:['APARTAMENTO','CASA'],    precoMin:300000,  precoMax:550000,  quartosMin:3, cidades:['Belo Horizonte'] }],
  [{ finalidade:'VENDA',   tipos:['COMERCIAL'],             precoMin:500000,  precoMax:1500000, quartosMin:null, cidades:['Belo Horizonte'] }],
  [{ finalidade:'VENDA',   tipos:['APARTAMENTO'],           precoMin:500000,  precoMax:900000,  quartosMin:2, cidades:['Belo Horizonte'] }],
  [{ finalidade:'ALUGUEL', tipos:['APARTAMENTO'],           precoMin:2500,    precoMax:5000,    quartosMin:2, cidades:['Belo Horizonte'] }, { finalidade:'VENDA', tipos:['APARTAMENTO'], precoMin:400000, precoMax:700000, quartosMin:2, cidades:['Belo Horizonte'] }],
  [{ finalidade:'VENDA',   tipos:['APARTAMENTO','CASA'],    precoMin:350000,  precoMax:700000,  quartosMin:2, cidades:['Belo Horizonte'] }],
  [{ finalidade:'VENDA',   tipos:['APARTAMENTO'],           precoMin:450000,  precoMax:850000,  quartosMin:2, cidades:['Belo Horizonte'] }],
  [{ finalidade:'ALUGUEL', tipos:['APARTAMENTO'],           precoMin:2000,    precoMax:4500,    quartosMin:2, cidades:['Belo Horizonte'] }],
  [{ finalidade:'VENDA',   tipos:['APARTAMENTO'],           precoMin:700000,  precoMax:1500000, quartosMin:3, cidades:['Belo Horizonte'] }],
  [{ finalidade:'VENDA',   tipos:['CASA'],                  precoMin:400000,  precoMax:800000,  quartosMin:3, cidades:['Belo Horizonte'] }],
  [{ finalidade:'VENDA',   tipos:['APARTAMENTO'],           precoMin:280000,  precoMax:500000,  quartosMin:2, cidades:['Belo Horizonte'] }],
  [{ finalidade:'VENDA',   tipos:['APARTAMENTO'],           precoMin:350000,  precoMax:650000,  quartosMin:2, cidades:['Belo Horizonte'] }, { finalidade:'ALUGUEL', tipos:['APARTAMENTO'], precoMin:2000, precoMax:4000, quartosMin:2, cidades:['Belo Horizonte'] }],
  [{ finalidade:'ALUGUEL', tipos:['COMERCIAL'],             precoMin:3000,    precoMax:7000,    quartosMin:null, cidades:['Belo Horizonte'] }],
  [{ finalidade:'ALUGUEL', tipos:['COMERCIAL'],             precoMin:2000,    precoMax:5000,    quartosMin:null, cidades:['Belo Horizonte'] }],
  [{ finalidade:'VENDA',   tipos:['APARTAMENTO'],           precoMin:400000,  precoMax:700000,  quartosMin:2, cidades:['Belo Horizonte'] }],

  // Corretor Três — índices 35-49
  [{ finalidade:'VENDA',   tipos:['APARTAMENTO'],           precoMin:350000,  precoMax:700000,  quartosMin:2, cidades:['Belo Horizonte'] }],
  [{ finalidade:'ALUGUEL', tipos:['COMERCIAL'],             precoMin:1500,    precoMax:4000,    quartosMin:null, cidades:['Belo Horizonte'] }],
  [{ finalidade:'VENDA',   tipos:['APARTAMENTO'],           precoMin:500000,  precoMax:950000,  quartosMin:2, cidades:['Belo Horizonte'] }],
  [{ finalidade:'VENDA',   tipos:['APARTAMENTO'],           precoMin:400000,  precoMax:700000,  quartosMin:2, cidades:['Belo Horizonte'] }],
  [{ finalidade:'ALUGUEL', tipos:['APARTAMENTO'],           precoMin:1500,    precoMax:3000,    quartosMin:2, cidades:['Belo Horizonte'] }],
  [{ finalidade:'VENDA',   tipos:['CASA'],                  precoMin:400000,  precoMax:700000,  quartosMin:3, cidades:['Belo Horizonte'] }],
  [{ finalidade:'ALUGUEL', tipos:['COMERCIAL','APARTAMENTO'],precoMin:2000,   precoMax:5000,    quartosMin:null, cidades:['Belo Horizonte'] }],
  [{ finalidade:'VENDA',   tipos:['APARTAMENTO','CASA'],    precoMin:250000,  precoMax:450000,  quartosMin:2, cidades:['Belo Horizonte'] }],
  [{ finalidade:'VENDA',   tipos:['APARTAMENTO'],           precoMin:350000,  precoMax:650000,  quartosMin:2, cidades:['Belo Horizonte'] }],
  [{ finalidade:'VENDA',   tipos:['APARTAMENTO'],           precoMin:500000,  precoMax:1000000, quartosMin:2, cidades:['Belo Horizonte'] }],
  [{ finalidade:'ALUGUEL', tipos:['APARTAMENTO'],           precoMin:1800,    precoMax:3500,    quartosMin:2, cidades:['Belo Horizonte'] }],
  [{ finalidade:'VENDA',   tipos:['APARTAMENTO','COMERCIAL'],precoMin:400000, precoMax:900000,  quartosMin:null, cidades:['Belo Horizonte'] }],
  [{ finalidade:'VENDA',   tipos:['APARTAMENTO'],           precoMin:300000,  precoMax:500000,  quartosMin:2, cidades:['Belo Horizonte'] }],
  [{ finalidade:'VENDA',   tipos:['APARTAMENTO'],           precoMin:600000,  precoMax:1200000, quartosMin:3, cidades:['Belo Horizonte'] }],
  [{ finalidade:'VENDA',   tipos:['APARTAMENTO'],           precoMin:400000,  precoMax:800000,  quartosMin:2, cidades:['Belo Horizonte'] }],
]

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

function etapaAleatoria() {
  return pick(ETAPA_POOL)
}

async function main() {
  console.log('🚀 Iniciando seed — BH Premium Imóveis\n')

  // Busca todos imóveis disponíveis
  const imoveis = await prisma.imovel.findMany({
    where:   { tenantId: TENANT_ID, status: 'DISPONIVEL' },
    select:  { id: true, finalidade: true, preco: true, tipoId: true, cidadeId: true },
    orderBy: { createdAt: 'asc' },
  })
  console.log(`📦 ${imoveis.length} imóveis disponíveis carregados`)

  // Separa por finalidade para facilitar o matching manual
  const imoveisVenda   = imoveis.filter(i => i.finalidade === 'VENDA')
  const imoveisAluguel = imoveis.filter(i => i.finalidade === 'ALUGUEL')

  // Remove clientes existentes (limpa seed anterior se rodar de novo)
  const existentes = await prisma.cliente.count({ where: { tenantId: TENANT_ID } })
  if (existentes > 0) {
    console.log(`⚠️  Encontrados ${existentes} clientes. Limpando para re-seed...`)
    // Precisa remover na ordem correta: matches → perfis → clientes
    const perfisIds = (await prisma.perfilBusca.findMany({ where: { tenantId: TENANT_ID }, select: { id: true } })).map(p => p.id)
    await prisma.match.deleteMany({ where: { tenantId: TENANT_ID, perfilId: { in: perfisIds } } })
    await prisma.perfilBusca.deleteMany({ where: { tenantId: TENANT_ID } })
    await prisma.cliente.deleteMany({ where: { tenantId: TENANT_ID } })
    console.log('🗑️  Limpeza concluída\n')
  }

  let totalClientes = 0
  let totalPerfis   = 0
  let totalMatches  = 0

  for (let i = 0; i < CLIENTES_DATA.length; i++) {
    const dadosCliente = CLIENTES_DATA[i]

    // Determina o corretor
    let corretorId = null
    if (i < 5) {
      corretorId = null  // sem corretor
    } else if (i < 20) {
      corretorId = CORRETORES[0].id  // Tiago Lana
    } else if (i < 35) {
      corretorId = CORRETORES[1].id  // Corretor Dois
    } else {
      corretorId = CORRETORES[2].id  // Corretor Três
    }

    // Cria cliente
    const cliente = await prisma.cliente.create({
      data: {
        tenantId:   TENANT_ID,
        corretorId,
        nome:        dadosCliente.nome,
        email:       dadosCliente.email,
        whatsapp:    dadosCliente.whatsapp,
        cpf:         dadosCliente.cpf,
        observacoes: dadosCliente.observacoes,
      },
    })
    totalClientes++

    const perfisDoCliente = PERFIS_TEMPLATE[i]

    for (const perfTpl of perfisDoCliente) {
      // Resolve tipoIds
      const tipoIds = perfTpl.tipos.map(t => TIPOS[t]).filter(Boolean)

      // Cria perfil de busca
      const perfil = await prisma.perfilBusca.create({
        data: {
          tenantId:  TENANT_ID,
          clienteId: cliente.id,
          finalidade: perfTpl.finalidade,
          precoMin:  perfTpl.precoMin,
          precoMax:  perfTpl.precoMax,
          areaMin:   40,
          quartosMin: perfTpl.quartosMin,
          cidades:   perfTpl.cidades,
          bairros:   [],
          tipos:     { connect: tipoIds.map(id => ({ id })) },
        },
      })
      totalPerfis++

      // Seleciona imóveis compatíveis (mesma finalidade, preço dentro da faixa)
      const pool = (perfTpl.finalidade === 'VENDA' ? imoveisVenda : imoveisAluguel)
        .filter(im =>
          Number(im.preco) >= perfTpl.precoMin * 0.8 &&
          Number(im.preco) <= perfTpl.precoMax * 1.2
        )

      // Pega entre 2 e 4 imóveis aleatórios do pool
      const shuffled   = [...pool].sort(() => Math.random() - 0.5)
      const qtd        = Math.min(shuffled.length, 2 + Math.floor(Math.random() * 3))
      const escolhidos = shuffled.slice(0, qtd)

      for (const imovel of escolhidos) {
        try {
          await prisma.match.create({
            data: {
              tenantId:  TENANT_ID,
              perfilId:  perfil.id,
              imovelId:  imovel.id,
              etapaId:   etapaAleatoria(),
              corretorId,  // herda o corretor do cliente
            },
          })
          totalMatches++
        } catch {
          // ignora duplicata (unique [perfilId, imovelId])
        }
      }
    }

    const tag = corretorId
      ? CORRETORES.find(c => c.id === corretorId)?.nome
      : 'Sem corretor'
    console.log(`  ✅ [${String(i + 1).padStart(2, '0')}] ${dadosCliente.nome} → ${tag}`)
  }

  console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✔ Seed concluído!
  👥 Clientes criados : ${totalClientes}
  🔍 Perfis criados   : ${totalPerfis}
  🎯 Matches criados  : ${totalMatches}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
}

main()
  .catch(e => { console.error('❌ Erro:', e); process.exit(1) })
  .finally(() => prisma.$disconnect())
