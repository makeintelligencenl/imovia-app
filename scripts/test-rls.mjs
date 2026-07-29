/**
 * Teste de isolamento RLS entre tenants
 *
 * Uso:
 *   node scripts/test-rls.mjs
 *
 * Variáveis de ambiente necessárias (ou edite as constantes abaixo):
 *   API_URL        — URL base da API (ex: https://api-imovia.makeintelligence.com.br/api/v1)
 *   TENANT_A_EMAIL — email de admin do Tenant A
 *   TENANT_A_PASS  — senha do Tenant A
 *   TENANT_B_EMAIL — email de admin do Tenant B
 *   TENANT_B_PASS  — senha do Tenant B
 *   CF_TOKEN       — token do Cloudflare Turnstile (use '1x00000000000000000000AA' para testes)
 */

const API_URL       = process.env.API_URL        ?? 'https://api-imovia.makeintelligence.com.br/api/v1'
const EMAIL_A       = process.env.TENANT_A_EMAIL ?? 'admin-tenant-a@exemplo.com'
const SENHA_A       = process.env.TENANT_A_PASS  ?? 'senha-tenant-a'
const EMAIL_B       = process.env.TENANT_B_EMAIL ?? 'admin-tenant-b@exemplo.com'
const SENHA_B       = process.env.TENANT_B_PASS  ?? 'senha-tenant-b'
// Token especial do Turnstile para testes (sempre válido em modo test)
const CF_TOKEN      = process.env.CF_TOKEN       ?? '1x00000000000000000000AA'

let passed = 0
let failed = 0

function ok(msg)   { console.log(`  ✅ ${msg}`); passed++ }
function fail(msg) { console.log(`  ❌ ${msg}`); failed++ }
function info(msg) { console.log(`\n─── ${msg}`) }

async function login(email, senha) {
  const res = await fetch(`${API_URL}/auth/login`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ email, password: senha, cfTurnstileToken: CF_TOKEN }),
  })
  if (!res.ok) throw new Error(`Login falhou para ${email}: ${res.status} ${await res.text()}`)
  const data = await res.json()
  return { token: data.token, user: data.user }
}

async function get(path, token) {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  return { status: res.status, body: res.ok ? await res.json() : null }
}

async function run() {
  console.log(`\n🔒 Teste de Isolamento RLS — ImovIA`)
  console.log(`   API: ${API_URL}\n`)

  // ── Login ────────────────────────────────────────────────────────────────
  info('Autenticando os dois tenants...')
  let tokenA, userA, tokenB, userB
  try {
    ;({ token: tokenA, user: userA } = await login(EMAIL_A, SENHA_A))
    ok(`Tenant A autenticado: ${userA.name} (tenant: ${userA.tenantId})`)
  } catch (e) {
    fail(`Tenant A: ${e.message}`)
    process.exit(1)
  }
  try {
    ;({ token: tokenB, user: userB } = await login(EMAIL_B, SENHA_B))
    ok(`Tenant B autenticado: ${userB.name} (tenant: ${userB.tenantId})`)
  } catch (e) {
    fail(`Tenant B: ${e.message}`)
    process.exit(1)
  }

  if (userA.tenantId === userB.tenantId) {
    fail('Os dois usuários pertencem ao mesmo tenant — use contas de tenants diferentes')
    process.exit(1)
  }

  // ── Coleta IDs do Tenant B ───────────────────────────────────────────────
  info('Coletando recursos do Tenant B...')

  const { body: clientesB } = await get('/clientes', tokenB)
  const clienteB = clientesB?.data?.[0] ?? clientesB?.[0]
  if (clienteB) ok(`Cliente B encontrado: ${clienteB.id} (${clienteB.nome})`)
  else { fail('Tenant B não tem clientes — cadastre ao menos 1 cliente no Tenant B'); process.exit(1) }

  const { body: imoveisB } = await get('/imoveis', tokenB)
  const imovelB = imoveisB?.data?.[0] ?? imoveisB?.[0]
  if (imovelB) ok(`Imóvel B encontrado: ${imovelB.id} (${imovelB.titulo})`)
  else fail('Tenant B não tem imóveis (teste de imóvel será pulado)')

  const { body: matchesB } = await get('/matches', tokenB)
  const matchB = matchesB?.data?.[0] ?? matchesB?.[0]
  if (matchB) ok(`Match B encontrado: ${matchB.id}`)
  else fail('Tenant B não tem matches (teste de match será pulado)')

  // ── Testes de isolamento: Tenant A tentando acessar dados do Tenant B ───
  info('Testando isolamento — Tenant A tentando acessar dados do Tenant B...')

  // Teste 1: listar clientes — Tenant A não deve ver clientes do B
  const { body: clientesComTokenA } = await get('/clientes', tokenA)
  const clientesA = clientesComTokenA?.data ?? clientesComTokenA ?? []
  const vazouCliente = Array.isArray(clientesA) && clientesA.some(c => c.tenantId === userB.tenantId)
  if (vazouCliente) fail('VAZAMENTO: clientes do Tenant B visíveis para Tenant A')
  else ok('Listagem de clientes: Tenant A não enxerga clientes do Tenant B')

  // Teste 2: buscar cliente específico do Tenant B com token do Tenant A
  const { status: statusCliente } = await get(`/clientes/${clienteB.id}`, tokenA)
  if (statusCliente === 200) fail(`VAZAMENTO: GET /clientes/${clienteB.id} retornou 200 para Tenant A`)
  else ok(`GET /clientes/{id-B} retornou ${statusCliente} para Tenant A (esperado 404)`)

  // Teste 3: imóvel específico do Tenant B
  if (imovelB) {
    const { status: statusImovel } = await get(`/imoveis/${imovelB.id}`, tokenA)
    if (statusImovel === 200) fail(`VAZAMENTO: GET /imoveis/${imovelB.id} retornou 200 para Tenant A`)
    else ok(`GET /imoveis/{id-B} retornou ${statusImovel} para Tenant A (esperado 404)`)
  }

  // Teste 4: match específico do Tenant B
  if (matchB) {
    const { status: statusMatch } = await get(`/matches/${matchB.id}`, tokenA)
    if (statusMatch === 200) fail(`VAZAMENTO: GET /matches/${matchB.id} retornou 200 para Tenant A`)
    else ok(`GET /matches/{id-B} retornou ${statusMatch} para Tenant A (esperado 404)`)
  }

  // Teste 5: listagem de matches — Tenant A não deve ver matches do B
  if (matchesB) {
    const { body: matchesComTokenA } = await get('/matches', tokenA)
    const matchListA = matchesComTokenA?.data ?? matchesComTokenA ?? []
    const vazouMatch = Array.isArray(matchListA) && matchListA.some(m => m.tenantId === userB.tenantId)
    if (vazouMatch) fail('VAZAMENTO: matches do Tenant B visíveis para Tenant A')
    else ok('Listagem de matches: Tenant A não enxerga matches do Tenant B')
  }

  // ── Resultado ─────────────────────────────────────────────────────────────
  console.log(`\n${'─'.repeat(50)}`)
  console.log(`Resultado: ${passed} passou | ${failed} falhou`)
  if (failed === 0) console.log('✅ Isolamento RLS validado — nenhum vazamento detectado')
  else              console.log('❌ ATENÇÃO: vazamentos detectados — revise as policies de RLS')
  console.log()
  process.exit(failed > 0 ? 1 : 0)
}

run().catch(e => { console.error(e); process.exit(1) })
