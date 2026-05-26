import Link from 'next/link'
import {
  Building2, Bell, Users, ArrowRight, CheckCircle,
  GitMerge, LayoutDashboard, Home, Search, ChevronDown,
  Pencil, Trash2, TrendingUp, Zap, Shield, BarChart3,
  Bot, MessageSquare, ClipboardList, Handshake,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ChatAnimado } from '@/components/chat-animado'

/* ─── tiny helpers ─────────────────────────────────────────────── */
function Badge({ children, color }: { children: React.ReactNode; color: string }) {
  const map: Record<string, string> = {
    orange: 'bg-orange-100 text-orange-700',
    purple: 'bg-purple-100 text-purple-700',
    green:  'bg-green-100  text-green-700',
    blue:   'bg-blue-100   text-blue-700',
    red:    'bg-red-100    text-red-700',
    yellow: 'bg-yellow-100 text-yellow-700',
    slate:  'bg-slate-100  text-slate-600',
  }
  return (
    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${map[color]}`}>
      {children}
    </span>
  )
}

function Blur({ w = 'w-24' }: { w?: string }) {
  return <span className={`inline-block ${w} h-3 rounded bg-slate-200 blur-sm`} />
}

function FakeSelect({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-1 border border-slate-200 rounded px-2 py-1 text-[10px] text-slate-500 bg-white">
      {label} <ChevronDown className="h-2.5 w-2.5" />
    </div>
  )
}

/* ─── MOCKUP: Dashboard ─────────────────────────────────────────── */
function MockDashboard() {
  const kpis = [
    { label: 'Imóveis',        value: '11', sub: '8 disponíveis', color: 'text-blue-600',  bg: 'bg-blue-50' },
    { label: 'Perfis Ativos',  value: '7',  sub: '7 com busca ativa', color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: 'Matches',        value: '11', sub: '73% de conversão', color: 'text-green-600',  bg: 'bg-green-50' },
    { label: 'Ticket Médio',   value: 'R$254k', sub: 'imóveis disponíveis', color: 'text-orange-600', bg: 'bg-orange-50' },
  ]
  const funnel = [
    { label: 'Identificado', w: 'w-full',    color: 'bg-blue-500' },
    { label: 'Notificado',   w: 'w-10/12',   color: 'bg-indigo-500' },
    { label: 'Interessado',  w: 'w-8/12',    color: 'bg-purple-500' },
    { label: 'Visita',       w: 'w-6/12',    color: 'bg-yellow-500' },
    { label: 'Proposta',     w: 'w-4/12',    color: 'bg-orange-500' },
    { label: 'Concluído',    w: 'w-2/12',    color: 'bg-green-500' },
  ]
  return (
    <div className="bg-slate-100 rounded-xl overflow-hidden shadow-2xl border border-slate-200 text-[11px]">
      {/* topbar */}
      <div className="flex">
        {/* sidebar mini */}
        <div className="w-28 bg-[#0F172A] flex flex-col shrink-0 py-3 px-2 gap-3">
          <div className="flex items-center gap-1.5 mb-1 px-1">
            <div className="p-1 rounded bg-blue-500/20"><Building2 className="h-3 w-3 text-blue-400" /></div>
            <div className="leading-tight"><p className="text-[9px] font-bold text-white">Imov<span className="text-blue-400">IA</span></p></div>
          </div>
          <p className="text-[8px] uppercase tracking-widest text-slate-600 px-1">Menu</p>
          {[
            { icon: LayoutDashboard, label: 'Dashboard', active: true },
            { icon: Home,            label: 'Imóveis' },
            { icon: Users,           label: 'Perfis' },
            { icon: GitMerge,        label: 'Matches' },
          ].map((item) => (
            <div key={item.label} className={`flex items-center gap-1.5 px-1.5 py-1 rounded text-[9px] font-medium ${item.active ? 'bg-blue-500/15 text-blue-400' : 'text-slate-400'}`}>
              <item.icon className="h-2.5 w-2.5 shrink-0" /> {item.label}
            </div>
          ))}
        </div>

        {/* content */}
        <div className="flex-1 p-3 overflow-hidden">
          <p className="font-bold text-slate-800 text-xs mb-2">Dashboard</p>
          {/* KPIs */}
          <div className="grid grid-cols-4 gap-1.5 mb-3">
            {kpis.map((k) => (
              <div key={k.label} className={`${k.bg} rounded-lg p-2`}>
                <p className="text-[9px] text-slate-500">{k.label}</p>
                <p className={`text-sm font-bold ${k.color}`}>{k.value}</p>
                <p className="text-[8px] text-slate-400">{k.sub}</p>
              </div>
            ))}
          </div>
          {/* Charts row */}
          <div className="grid grid-cols-3 gap-1.5">
            {/* Funnel */}
            <div className="col-span-2 bg-white rounded-lg p-2">
              <p className="text-[9px] font-semibold text-slate-700 mb-1.5">Funil de Matches</p>
              <div className="space-y-1">
                {funnel.map((f) => (
                  <div key={f.label} className="flex items-center gap-1.5">
                    <p className="text-[8px] text-slate-400 w-14 shrink-0">{f.label}</p>
                    <div className={`h-2 rounded-sm ${f.color} ${f.w}`} />
                  </div>
                ))}
              </div>
            </div>
            {/* Donut */}
            <div className="bg-white rounded-lg p-2 flex flex-col">
              <p className="text-[9px] font-semibold text-slate-700 mb-1">Por Tipo</p>
              <div className="flex-1 flex items-center justify-center">
                <div className="relative">
                  <svg viewBox="0 0 36 36" className="w-14 h-14 -rotate-90">
                    <circle cx="18" cy="18" r="13" fill="none" stroke="#e2e8f0" strokeWidth="5" />
                    <circle cx="18" cy="18" r="13" fill="none" stroke="#3b82f6" strokeWidth="5" strokeDasharray="40 60" />
                    <circle cx="18" cy="18" r="13" fill="none" stroke="#8b5cf6" strokeWidth="5" strokeDasharray="30 70" strokeDashoffset="-40" />
                    <circle cx="18" cy="18" r="13" fill="none" stroke="#f59e0b" strokeWidth="5" strokeDasharray="30 70" strokeDashoffset="-70" />
                  </svg>
                </div>
              </div>
              <div className="space-y-0.5 mt-1">
                {[['Casa','#3b82f6'],['Apto','#8b5cf6'],['Comerc.','#f59e0b']].map(([l,c])=>(
                  <div key={l} className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-sm shrink-0" style={{ background: c }} />
                    <p className="text-[8px] text-slate-500">{l}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ─── MOCKUP: Imóveis ───────────────────────────────────────────── */
function MockImoveis() {
  const rows = [
    { title: 'Sala Comercial',          tipo: 'Comercial',   fin: 'Aluguel', finColor: 'orange', preco: 'R$ 3.000,00',   area: '45 m²',  q: '—',  local: 'Centro, Cor. Fabriciano', status: 'Alugado',    sc: 'blue' },
    { title: 'Apartamento 3 quartos',   tipo: 'Apartamento', fin: 'Venda',   finColor: 'purple', preco: 'R$ 420.000,00', area: '98 m²',  q: '3',  local: 'Cidade Nobre, Ipatinga',  status: 'Disponível', sc: 'green' },
    { title: 'Casa alto padrão',        tipo: 'Casa',        fin: 'Venda',   finColor: 'purple', preco: 'R$ 980.000,00', area: '320 m²', q: '4',  local: 'Cidade Nobre, Ipatinga',  status: 'Disponível', sc: 'green' },
    { title: 'Apartamento 2 quartos',   tipo: 'Apartamento', fin: 'Aluguel', finColor: 'orange', preco: 'R$ 1.100,00',   area: '60 m²',  q: '2',  local: 'Centro, Timóteo',         status: 'Disponível', sc: 'green' },
    { title: 'Sala comercial no Cariru',tipo: 'Comercial',   fin: 'Aluguel', finColor: 'orange', preco: 'R$ 2.800,00',   area: '55 m²',  q: '—',  local: 'Cariru, Ipatinga',        status: 'Disponível', sc: 'green' },
  ]
  return (
    <div className="bg-white rounded-xl overflow-hidden shadow-2xl border border-slate-200 text-[10px]">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100">
        <div><p className="font-bold text-slate-800 text-xs">Imóveis</p><p className="text-slate-400">11 de 11 imóvel(is)</p></div>
        <div className="flex items-center gap-1.5 bg-blue-600 text-white px-2.5 py-1 rounded-lg text-[10px] font-semibold">
          <span>+</span> Novo imóvel
        </div>
      </div>
      {/* filters */}
      <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 border-b border-slate-100">
        <div className="flex items-center gap-1 border border-slate-200 rounded px-2 py-1 text-slate-400 bg-white flex-1 max-w-[180px]">
          <Search className="h-2.5 w-2.5" /> <span className="text-[9px]">Título, bairro ou cidade...</span>
        </div>
        <FakeSelect label="Todos os tipos" />
        <FakeSelect label="Todas" />
        <FakeSelect label="Todos" />
      </div>
      {/* table header */}
      <div className="grid grid-cols-[2fr_1fr_1fr_1.2fr_0.7fr_0.5fr_1.5fr_1fr_0.5fr] gap-2 px-4 py-1.5 bg-slate-50 border-b border-slate-100">
        {['TÍTULO','TIPO','FINALIDADE','PREÇO','ÁREA','QUARTOS','LOCALIZAÇÃO','STATUS','AÇÕES'].map((h) => (
          <p key={h} className="text-[8px] font-semibold text-slate-400 uppercase tracking-wide">{h}</p>
        ))}
      </div>
      {/* rows */}
      {rows.map((r) => (
        <div key={r.title} className="grid grid-cols-[2fr_1fr_1fr_1.2fr_0.7fr_0.5fr_1.5fr_1fr_0.5fr] gap-2 px-4 py-2 border-b border-slate-50 items-center hover:bg-slate-50/60">
          <p className="font-medium text-slate-700 truncate">{r.title}</p>
          <p className="text-slate-500">{r.tipo}</p>
          <Badge color={r.finColor}>{r.fin}</Badge>
          <p className="font-medium text-slate-700">{r.preco}</p>
          <p className="text-slate-500">{r.area}</p>
          <p className="text-slate-400">{r.q}</p>
          <p className="text-slate-400 truncate">{r.local}</p>
          <Badge color={r.sc}>{r.status}</Badge>
          <div className="flex gap-1.5">
            <Pencil className="h-3 w-3 text-slate-400" />
            <Trash2 className="h-3 w-3 text-red-300" />
          </div>
        </div>
      ))}
    </div>
  )
}

/* ─── MOCKUP: Perfis ────────────────────────────────────────────── */
function MockPerfis() {
  const rows = [
    { name: 'João S.',    fin: 'Aluguel', finC: 'orange', tipo: 'Apartamento', faixa: 'R$ 1.000 – R$ 1.500', area: '50 m²', q: '—',  cidades: 'Timóteo' },
    { name: 'Ana L.',     fin: 'Compra',  finC: 'purple', tipo: 'Apartamento', faixa: 'R$ 200k – R$ 450k',   area: '70 m²', q: '2',  cidades: 'Ipatinga' },
    { name: 'Carlos M.',  fin: 'Compra',  finC: 'purple', tipo: 'Casa',        faixa: 'R$ 200k – R$ 320k',   area: '100 m²',q: '3',  cidades: 'Cor. Fabriciano' },
    { name: 'Marcos V.',  fin: 'Aluguel', finC: 'orange', tipo: 'Comercial',   faixa: 'R$ 1.500 – R$ 3.500', area: '40 m²', q: '—',  cidades: 'Ipatinga, Cor. Fab.' },
    { name: 'Patrícia O.',fin: 'Aluguel', finC: 'orange', tipo: 'Apartamento / Casa', faixa: 'R$ 800 – R$ 1.600', area: '50 m²', q: '2', cidades: 'Ipatinga' },
  ]
  return (
    <div className="bg-white rounded-xl overflow-hidden shadow-2xl border border-slate-200 text-[10px]">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100">
        <div><p className="font-bold text-slate-800 text-xs">Perfis de Busca</p><p className="text-slate-400">7 de 7 perfil(is)</p></div>
        <div className="flex items-center gap-1.5 bg-blue-600 text-white px-2.5 py-1 rounded-lg text-[10px] font-semibold">
          <span>+</span> Novo perfil
        </div>
      </div>
      <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 border-b border-slate-100">
        <div className="flex items-center gap-1 border border-slate-200 rounded px-2 py-1 text-slate-400 bg-white flex-1 max-w-[200px]">
          <Search className="h-2.5 w-2.5" /> <span className="text-[9px]">Nome, e-mail ou cidade...</span>
        </div>
        <FakeSelect label="Todas" />
        <FakeSelect label="Todos os tipos" />
      </div>
      <div className="grid grid-cols-[2fr_1fr_1.2fr_1.5fr_0.8fr_0.6fr_1.5fr_0.5fr] gap-2 px-4 py-1.5 bg-slate-50 border-b border-slate-100">
        {['CLIENTE','FINALIDADE','TIPOS','FAIXA DE PREÇO','ÁREA MÍN.','QUARTOS MÍN.','CIDADES / BAIRROS','AÇÕES'].map((h) => (
          <p key={h} className="text-[8px] font-semibold text-slate-400 uppercase tracking-wide">{h}</p>
        ))}
      </div>
      {rows.map((r) => (
        <div key={r.name} className="grid grid-cols-[2fr_1fr_1.2fr_1.5fr_0.8fr_0.6fr_1.5fr_0.5fr] gap-2 px-4 py-2 border-b border-slate-50 items-center hover:bg-slate-50/60">
          <div>
            <p className="font-medium text-slate-700">{r.name}</p>
            <Blur w="w-20" />
          </div>
          <Badge color={r.finC}>{r.fin}</Badge>
          <p className="text-slate-500">{r.tipo}</p>
          <p className="text-slate-700">{r.faixa}</p>
          <p className="text-slate-500">{r.area}</p>
          <p className="text-slate-400">{r.q}</p>
          <p className="text-slate-500 truncate">{r.cidades}</p>
          <div className="flex gap-1.5">
            <Pencil className="h-3 w-3 text-slate-400" />
            <Trash2 className="h-3 w-3 text-red-300" />
          </div>
        </div>
      ))}
    </div>
  )
}

/* ─── MOCKUP: Matches ───────────────────────────────────────────── */
function MockMatches() {
  const rows = [
    { imovel: 'Apartamento 2 quartos', local: 'Centro, Timóteo',          tipo: 'Apartamento', fin: 'Aluguel', finC: 'orange', preco: 'R$ 1.100,00',   cliente: 'João S.',    status: 'Notificado',  sc: 'slate' },
    { imovel: 'Sala Comercial',        local: 'Centro, Cor. Fabriciano',  tipo: 'Comercial',   fin: 'Aluguel', finC: 'orange', preco: 'R$ 3.000,00',   cliente: 'Marcos V.',  status: 'Notificado',  sc: 'slate' },
    { imovel: 'Apartamento 3 quartos', local: 'Cidade Nobre, Ipatinga',   tipo: 'Apartamento', fin: 'Venda',   finC: 'purple', preco: 'R$ 420.000,00', cliente: 'Ana L.',     status: 'Descartado',  sc: 'red' },
    { imovel: 'Sala comercial no Cariru', local: 'Cariru, Ipatinga',      tipo: 'Comercial',   fin: 'Aluguel', finC: 'orange', preco: 'R$ 2.800,00',   cliente: 'Marcos V.',  status: 'Interessado', sc: 'yellow' },
    { imovel: 'Apartamento 3 quartos', local: 'Iguaçu, Ipatinga',         tipo: 'Apartamento', fin: 'Venda',   finC: 'purple', preco: 'R$ 285.000,00', cliente: 'Carlos M.',  status: 'Interessado', sc: 'yellow' },
  ]
  return (
    <div className="bg-white rounded-xl overflow-hidden shadow-2xl border border-slate-200 text-[10px]">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100">
        <div><p className="font-bold text-slate-800 text-xs">Matches</p><p className="text-slate-400">11 de 11 match(es)</p></div>
      </div>
      <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 border-b border-slate-100">
        <div className="flex items-center gap-1 border border-slate-200 rounded px-2 py-1 text-slate-400 bg-white flex-1 max-w-[200px]">
          <Search className="h-2.5 w-2.5" /> <span className="text-[9px]">Imóvel, cliente ou cidade...</span>
        </div>
        <FakeSelect label="Todas" />
        <FakeSelect label="Todos" />
      </div>
      <div className="grid grid-cols-[2fr_1.2fr_1fr_1.5fr_1.2fr_0.6fr_1fr] gap-2 px-4 py-1.5 bg-slate-50 border-b border-slate-100">
        {['IMÓVEL','TIPO / FINALIDADE','PREÇO','CLIENTE','CONTATO','DATA','STATUS'].map((h) => (
          <p key={h} className="text-[8px] font-semibold text-slate-400 uppercase tracking-wide">{h}</p>
        ))}
      </div>
      {rows.map((r, i) => (
        <div key={i} className="grid grid-cols-[2fr_1.2fr_1fr_1.5fr_1.2fr_0.6fr_1fr] gap-2 px-4 py-2 border-b border-slate-50 items-center hover:bg-slate-50/60">
          <div>
            <p className="font-medium text-slate-700 truncate">{r.imovel}</p>
            <p className="text-slate-400 truncate">{r.local}</p>
          </div>
          <div>
            <p className="text-slate-500">{r.tipo}</p>
            <Badge color={r.finC}>{r.fin}</Badge>
          </div>
          <p className="font-medium text-slate-700">{r.preco}</p>
          <p className="font-medium text-slate-700">{r.cliente}</p>
          <Blur w="w-24" />
          <p className="text-slate-400">21/05/26</p>
          <Badge color={r.sc}>{r.status}</Badge>
        </div>
      ))}
    </div>
  )
}

/* ─── MAIN PAGE ─────────────────────────────────────────────────── */
export default function LandingPage() {
  const features = [
    {
      icon: Bot,
      title: 'Agente IA de pré-atendimento',
      desc: 'Conversa com o cliente, qualifica o perfil de busca e registra tudo no sistema — 24h por dia, sem intervenção humana.',
    },
    {
      icon: Zap,
      title: 'Matching automático',
      desc: 'Quando um imóvel é cadastrado, o sistema cruza automaticamente com todos os perfis de busca ativos e gera os matches — sem nenhuma ação manual.',
    },
    {
      icon: Bell,
      title: 'Notificação instantânea',
      desc: 'O cliente é avisado por e-mail e WhatsApp assim que um imóvel compatível aparecer. Nada passa despercebido.',
    },
    {
      icon: BarChart3,
      title: 'Dashboard analítico',
      desc: 'Funil de negociação, distribuição por tipo, ticket médio, taxa de conversão — tudo em tempo real para tomada de decisão rápida.',
    },
    {
      icon: GitMerge,
      title: 'Funil de negociação',
      desc: 'Acompanhe cada match em 6 estágios: Identificado → Notificado → Interessado → Visita → Proposta → Concluído.',
    },
    {
      icon: Users,
      title: 'Perfis de busca detalhados',
      desc: 'Cadastre as preferências do cliente: tipo, finalidade, faixa de preço, área mínima, quartos, cidades e bairros específicos.',
    },
    {
      icon: Home,
      title: 'Gestão completa de imóveis',
      desc: 'Cadastre imóveis com tipo, finalidade, preço, área, quartos, bairro, cidade, CEP e código de origem da imobiliária.',
    },
    {
      icon: TrendingUp,
      title: 'Integra com seu ERP atual',
      desc: 'Não é preciso trocar de sistema. O ImovIA conecta ao ERP da sua imobiliária via API, importando imóveis e sincronizando dados automaticamente.',
    },
  ]

  const steps = [
    {
      step: '01',
      icon: Bot,
      title: 'Agente IA inicia o atendimento',
      desc: 'O cliente é atendido pelo Agente IA via WhatsApp, Instagram, Messenger ou diretamente no site da imobiliária — 24h por dia, 7 dias por semana.',
      highlight: true,
    },
    {
      step: '02',
      icon: Users,
      title: 'Perfil qualificado e registrado',
      desc: 'O Agente conversa com o cliente, entende o que ele busca e registra automaticamente o perfil no ImovIA — sem intervenção humana.',
      highlight: false,
    },
    {
      step: '03',
      icon: Building2,
      title: 'Imóvel cadastrado → Match gerado',
      desc: 'Quando um imóvel é cadastrado, o sistema cruza automaticamente os critérios do imóvel com os perfis de busca ativos e gera os matches.',
      highlight: false,
    },
    {
      step: '04',
      icon: Bell,
      title: 'Corretor fecha o negócio',
      desc: 'O corretor recebe o match no painel, aborda o cliente com a proposta certa e acompanha o funil até o fechamento.',
      highlight: false,
    },
  ]

  const comparisons = [
    { feature: 'Integra com ERP existente (sem troca)',    nos: true,  zap: false },
    { feature: 'Agente IA de pré-atendimento 24/7',       nos: true,  zap: false },
    { feature: 'Qualificação automática de perfil',       nos: true,  zap: false },
    { feature: 'Matching automático ao cadastrar imóvel', nos: true,  zap: false },
    { feature: 'Funil de negociação integrado',           nos: true,  zap: false },
    { feature: 'Dashboard analítico por imobiliária',     nos: true,  zap: false },
    { feature: 'Perfis de busca detalhados',              nos: true,  zap: true  },
  ]

  return (
    <div className="min-h-screen bg-white font-sans antialiased">

      {/* ── NAV ─────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 border-b border-slate-100 bg-white/95 backdrop-blur">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-blue-500/10">
              <Building2 className="h-5 w-5 text-blue-600" />
            </div>
            <span className="font-bold text-slate-900 text-xl leading-tight">
              Imov<span className="text-blue-600">IA</span>
            </span>
          </Link>
          <div className="hidden md:flex items-center gap-8 text-sm text-slate-600">
            <a href="#como-funciona" className="hover:text-slate-900 transition-colors">Como funciona</a>
            <a href="#agente-ia" className="hover:text-slate-900 transition-colors">Agente IA</a>
            <a href="#funcionalidades" className="hover:text-slate-900 transition-colors">Funcionalidades</a>
            <a href="#diferenciais" className="hover:text-slate-900 transition-colors">Diferenciais</a>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/login">Entrar</Link>
            </Button>
            <Button size="sm" asChild>
              <Link href="/login">Solicitar demonstração <ArrowRight className="h-3.5 w-3.5 ml-1" /></Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* ── HERO ────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#0F172A] text-white">
        {/* grid bg */}
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: 'linear-gradient(#334155 1px,transparent 1px),linear-gradient(90deg,#334155 1px,transparent 1px)', backgroundSize: '40px 40px' }} />

        {/* pills — largura total, acima do grid */}
        <div className="relative max-w-6xl mx-auto px-6 pt-16 pb-6 flex flex-nowrap gap-3 overflow-x-auto scrollbar-hide justify-center">
          {[
            { icon: Bot,       label: 'Agente IA 24h/dia',      color: 'bg-blue-500/10   text-blue-300   border-blue-500/20'   },
            { icon: Zap,       label: 'Match automático',        color: 'bg-green-500/10  text-green-300  border-green-500/20'  },
            { icon: Shield,    label: 'Integra com seu ERP',     color: 'bg-orange-500/10 text-orange-300 border-orange-500/20' },
            { icon: Handshake, label: 'Corretor foca em fechar', color: 'bg-purple-500/10 text-purple-300 border-purple-500/20' },
          ].map(({ icon: Icon, label, color }) => (
            <div key={label} className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold border whitespace-nowrap ${color}`}>
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </div>
          ))}
        </div>

        {/* 2 colunas: texto + chat */}
        <div className="relative max-w-6xl mx-auto px-6 pb-16 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">

          {/* ── Esquerda: texto ── */}
          <div>

            <h1 className="text-4xl lg:text-5xl font-extrabold tracking-tight leading-tight mb-5">
              O Agente IA atende e qualifica o cliente.<br />
              <span className="text-blue-400">O consultor fecha o negócio.</span>
            </h1>

            <p className="text-slate-400 text-lg mb-8 leading-relaxed">
              Pré-atendimento com IA, matching automático e notificação instantânea —
              sem trocar o ERP que você já usa.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-3 mb-10">
              <Button size="lg" className="bg-blue-600 hover:bg-blue-500 text-white" asChild>
                <Link href="/login">Solicitar demonstração <ArrowRight className="h-4 w-4 ml-2" /></Link>
              </Button>
              <a href="#como-funciona"
                className="inline-flex items-center justify-center h-10 px-8 rounded-md text-sm font-medium bg-slate-700 text-white hover:bg-slate-600 transition-colors whitespace-nowrap">
                Ver como funciona
              </a>
            </div>

          </div>

          {/* ── Direita: chat animado ── */}
          <div className="flex justify-center lg:justify-end">
            <ChatAnimado />
          </div>

        </div>
      </section>


      {/* ── COMO FUNCIONA ───────────────────────────────────────── */}
      <section id="como-funciona" className="py-24 bg-slate-50">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="text-blue-600 font-semibold text-sm uppercase tracking-widest mb-3">Processo simples</p>
            <h2 className="text-4xl font-bold text-slate-900 mb-4">Como funciona</h2>
            <p className="text-slate-500 text-lg max-w-2xl mx-auto">Do primeiro contato do cliente ao fechamento — tudo automático.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {steps.map((s, i) => (
              <div key={s.step} className="relative bg-[#0F172A] border border-blue-500/20 rounded-2xl p-6 shadow-sm">
                {i < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-10 -right-3 w-6 z-10">
                    <ArrowRight className="h-5 w-5 text-blue-400" />
                  </div>
                )}
                <div className="text-5xl font-black mb-4 leading-none text-blue-900">{s.step}</div>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4 bg-blue-500/20">
                  <s.icon className="h-5 w-5 text-blue-400" />
                </div>
                <h3 className="font-bold mb-2 text-white">{s.title}</h3>
                <p className="text-sm leading-relaxed text-slate-400">{s.desc}</p>
                {/* canais — só no passo 01 */}
                {i === 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-4">
                    {['WhatsApp','Instagram','Messenger','Site'].map((canal) => (
                      <span key={canal} className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/20">
                        {canal}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── AGENTE IA ───────────────────────────────────────────── */}
      <section id="agente-ia" className="py-24 bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#0F172A] text-white relative overflow-hidden">
        {/* grid bg */}
        <div className="absolute inset-0 opacity-5"
          style={{ backgroundImage: 'linear-gradient(#334155 1px,transparent 1px),linear-gradient(90deg,#334155 1px,transparent 1px)', backgroundSize: '40px 40px' }} />

        <div className="relative max-w-6xl mx-auto px-6">
          {/* header */}
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 bg-blue-500/15 text-blue-400 rounded-full px-4 py-1.5 text-sm font-medium mb-4 border border-blue-500/20">
              <Bot className="h-3.5 w-3.5" />
              Inteligência Artificial
            </div>
            <h2 className="text-4xl font-extrabold mb-3">
              Agente IA de Pré-atendimento
            </h2>
            <div className="inline-flex items-center gap-2 bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 rounded-full px-4 py-1.5 text-sm font-semibold mb-4">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
              24h por dia · 7 dias por semana
            </div>
            <p className="text-slate-400 text-lg max-w-2xl mx-auto">
              Um assistente inteligente que conversa com o cliente, qualifica o perfil de busca
              e registra tudo no sistema — para o corretor focar no que realmente importa: <span className="text-white font-semibold">fechar negócios.</span>
            </p>
          </div>

          {/* IA + Corretor visual */}
          <div className="flex flex-col lg:flex-row items-center gap-10 mb-16">
            {/* Agente IA card */}
            <div className="flex-1 bg-blue-500/10 border border-blue-500/20 rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                  <Bot className="h-5 w-5 text-blue-400" />
                </div>
                <div>
                  <p className="font-bold text-white">Agente ImovIA</p>
                  <p className="text-xs text-blue-400">Pré-atendimento inteligente</p>
                </div>
              </div>
              <ul className="space-y-3">
                {[
                  'Recebe o cliente via chat ou WhatsApp',
                  'Faz perguntas para entender o que ele busca',
                  'Qualifica: tipo, faixa de preço, localização, área',
                  'Registra automaticamente o perfil de busca no sistema',
                  'Disponível 24h por dia, 7 dias por semana',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm text-slate-300">
                    <CheckCircle className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* seta + conector */}
            <div className="flex flex-col items-center gap-2 shrink-0">
              <div className="hidden lg:flex flex-col items-center gap-1">
                <div className="w-px h-8 bg-white/10" />
                <ArrowRight className="h-6 w-6 text-blue-400" />
                <div className="w-px h-8 bg-white/10" />
              </div>
              <div className="bg-blue-600 rounded-full px-3 py-1.5 text-xs font-bold text-white whitespace-nowrap">
                Perfil registrado
              </div>
            </div>

            {/* Corretor card */}
            <div className="flex-1 bg-white/5 border border-white/10 rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
                  <Handshake className="h-5 w-5 text-green-400" />
                </div>
                <div>
                  <p className="font-bold text-white">Corretor de Imóveis</p>
                  <p className="text-xs text-green-400">Foco total em fechar negócios</p>
                </div>
              </div>
              <ul className="space-y-3">
                {[
                  'Recebe o perfil já qualificado e registrado',
                  'Visualiza os matches gerados automaticamente',
                  'Contata o cliente com a proposta certa',
                  'Acompanha o funil de negociação no dashboard',
                  'Mais tempo para visitas, negociações e fechamentos',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm text-slate-300">
                    <CheckCircle className="h-4 w-4 text-green-400 shrink-0 mt-0.5" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* mensagem central */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center max-w-3xl mx-auto">
            <div className="flex items-center justify-center gap-3 mb-4">
              <Bot className="h-6 w-6 text-blue-400" />
              <span className="text-2xl text-white/30">+</span>
              <Handshake className="h-6 w-6 text-green-400" />
            </div>
            <h3 className="text-xl font-bold text-white mb-3">
              IA e Corretor trabalhando juntos
            </h3>
            <p className="text-slate-400 leading-relaxed">
              O objetivo não é substituir o corretor — é eliminar o trabalho repetitivo de triagem e qualificação.
              O Agente IA cuida do pré-atendimento e do registro; o corretor entra em cena na hora certa,
              com todas as informações na mão e o cliente já qualificado.
            </p>
          </div>

          {/* 3 passos do fluxo */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
            {[
              {
                icon: MessageSquare,
                step: '01',
                title: 'Cliente inicia conversa',
                desc: 'Via chat no site, WhatsApp ou link compartilhado pelo corretor. O Agente IA responde na hora, a qualquer horário.',
                color: 'text-blue-400',
                bg: 'bg-blue-500/10 border-blue-500/20',
              },
              {
                icon: ClipboardList,
                step: '02',
                title: 'Agente qualifica e registra',
                desc: 'O Agente faz as perguntas certas, entende o que o cliente busca e cadastra automaticamente o perfil de busca no ImovIA.',
                color: 'text-purple-400',
                bg: 'bg-purple-500/10 border-purple-500/20',
              },
              {
                icon: Handshake,
                step: '03',
                title: 'Corretor entra em ação',
                desc: 'Com o perfil registrado, o motor de matching já gerou as oportunidades. O corretor aborda o cliente com a proposta ideal.',
                color: 'text-green-400',
                bg: 'bg-green-500/10 border-green-500/20',
              },
            ].map((item) => (
              <div key={item.step} className={`rounded-2xl p-6 border ${item.bg}`}>
                <div className="text-4xl font-black text-white/10 mb-3">{item.step}</div>
                <div className={`w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center mb-4`}>
                  <item.icon className={`h-5 w-5 ${item.color}`} />
                </div>
                <h3 className="font-bold text-white mb-2">{item.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SCREENS: IMOVEIS ────────────────────────────────────── */}
      <section className="py-24 bg-white overflow-hidden">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex flex-col lg:flex-row items-center gap-16">
            <div className="lg:w-2/5">
              <p className="text-blue-600 font-semibold text-sm uppercase tracking-widest mb-3">Gestão de imóveis</p>
              <h2 className="text-3xl font-bold text-slate-900 mb-4">Cadastro completo e organizado</h2>
              <p className="text-slate-500 leading-relaxed mb-6">
                Registre cada imóvel com todas as informações necessárias: tipo, finalidade, preço, área, quartos, localização, CEP e código de origem da imobiliária.
              </p>
              <ul className="space-y-3">
                {['Filtros por tipo, finalidade e status','Gestão de status com dropdown inline','Código de origem integrado ao sistema da imobiliária','Localização por cidade e bairro'].map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm text-slate-600">
                    <CheckCircle className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="lg:w-3/5 w-full">
              <MockImoveis />
            </div>
          </div>

          {/* Dashboard mockup abaixo */}
          <div className="mt-12">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-4 text-center">
              Painel da imobiliária
            </p>
            <MockDashboard />
          </div>
        </div>
      </section>

      {/* ── SCREENS: PERFIS ─────────────────────────────────────── */}
      <section className="py-24 bg-slate-50 overflow-hidden">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex flex-col lg:flex-row-reverse items-center gap-16">
            <div className="lg:w-2/5">
              <p className="text-blue-600 font-semibold text-sm uppercase tracking-widest mb-3">Perfis de busca</p>
              <h2 className="text-3xl font-bold text-slate-900 mb-4">O desejo do cliente, registrado com precisão</h2>
              <p className="text-slate-500 leading-relaxed mb-6">
                Capture os critérios de busca de cada cliente em detalhe. Nosso motor de matching usa exatamente esses critérios para encontrar o imóvel certo.
              </p>
              <ul className="space-y-3">
                {['Finalidade: compra ou aluguel','Múltiplos tipos de imóvel por perfil','Faixa de preço mínima e máxima','Múltiplas cidades e bairros por perfil'].map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm text-slate-600">
                    <CheckCircle className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="lg:w-3/5 w-full">
              <MockPerfis />
            </div>
          </div>
        </div>
      </section>

      {/* ── SCREENS: MATCHES ────────────────────────────────────── */}
      <section className="py-24 bg-white overflow-hidden">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex flex-col lg:flex-row items-center gap-16">
            <div className="lg:w-2/5">
              <p className="text-blue-600 font-semibold text-sm uppercase tracking-widest mb-3">Funil de negociação</p>
              <h2 className="text-3xl font-bold text-slate-900 mb-4">Acompanhe cada oportunidade até o fechamento</h2>
              <p className="text-slate-500 leading-relaxed mb-6">
                Todos os matches gerados ficam disponíveis em um painel único. Evolua o status de cada negociação e nunca perca uma oportunidade.
              </p>
              <div className="space-y-2">
                {[
                  ['Identificado', 'blue'],
                  ['Notificado',   'slate'],
                  ['Interessado',  'yellow'],
                  ['Visita agendada', 'purple'],
                  ['Proposta enviada','orange'],
                  ['Concluído',    'green'],
                ].map(([label, color]) => (
                  <div key={label} className="flex items-center gap-3">
                    <Badge color={color}>{label}</Badge>
                  </div>
                ))}
              </div>
            </div>
            <div className="lg:w-3/5 w-full">
              <MockMatches />
            </div>
          </div>
        </div>
      </section>

      {/* ── FUNCIONALIDADES ─────────────────────────────────────── */}
      <section id="funcionalidades" className="py-24 bg-[#0F172A] text-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="text-blue-400 font-semibold text-sm uppercase tracking-widest mb-3">Plataforma completa</p>
            <h2 className="text-4xl font-bold mb-4">Tudo que sua imobiliária precisa</h2>
            <p className="text-slate-400 text-lg max-w-2xl mx-auto">Desenvolvido especificamente para o mercado imobiliário brasileiro.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {features.map((f) => (
              <div key={f.title} className="bg-white/5 hover:bg-white/10 transition-colors rounded-2xl p-5 border border-white/10">
                <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center mb-4">
                  <f.icon className="h-5 w-5 text-blue-400" />
                </div>
                <h3 className="font-bold text-white mb-2 text-sm">{f.title}</h3>
                <p className="text-slate-400 text-xs leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── DIFERENCIAIS (comparação) ────────────────────────────── */}
      <section id="diferenciais" className="py-24 bg-slate-50">
        <div className="max-w-3xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="text-blue-600 font-semibold text-sm uppercase tracking-widest mb-3">Por que nos escolher</p>
            <h2 className="text-4xl font-bold text-slate-900 mb-4">O que nos diferencia</h2>
            <p className="text-slate-500 text-lg">Portais imobiliários conectam compradores a imóveis — nós conectamos imóveis a compradores, automaticamente.</p>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            {/* header */}
            <div className="grid grid-cols-[1fr_120px] border-b border-slate-100">
              <div className="p-4" />
              <div className="p-4 text-center border-l border-slate-100">
                <div className="flex items-center justify-center gap-1.5 mb-1">
                  <div className="p-1 rounded bg-blue-500/10"><Building2 className="h-3.5 w-3.5 text-blue-600" /></div>
                  <span className="font-bold text-slate-800 text-sm">Imov<span className="text-blue-600">IA</span></span>
                </div>
              </div>
            </div>
            {comparisons.map((c) => (
              <div key={c.feature} className="grid grid-cols-[1fr_120px] border-b border-slate-50 last:border-0">
                <div className="p-4 text-sm text-slate-700">{c.feature}</div>
                <div className="p-4 flex justify-center items-center border-l border-slate-100">
                  {c.nos
                    ? <CheckCircle className="h-5 w-5 text-green-500" />
                    : <span className="h-5 w-5 flex items-center justify-center text-slate-200 text-lg">—</span>
                  }
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden py-24 bg-gradient-to-br from-[#0F172A] via-[#1a2f5e] to-[#0F172A] text-white text-center">
        {/* grid bg */}
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: 'linear-gradient(#334155 1px,transparent 1px),linear-gradient(90deg,#334155 1px,transparent 1px)', backgroundSize: '40px 40px' }} />

        {/* glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-3xl mx-auto px-6">

          {/* badge */}
          <div className="inline-flex items-center gap-2 bg-blue-500/15 text-blue-300 border border-blue-500/25 rounded-full px-4 py-1.5 text-sm font-medium mb-6">
            <Bot className="h-3.5 w-3.5" />
            Enquanto você lê isso, leads estão sendo atendidos por IA
          </div>

          <h2 className="text-4xl lg:text-5xl font-extrabold mb-5 leading-tight">
            Sua imobiliária pode atender{' '}
            <span className="text-blue-400">mais leads hoje</span>,<br />
            sem contratar ninguém.
          </h2>

          <p className="text-slate-400 text-lg mb-10 max-w-xl mx-auto leading-relaxed">
            O ImovIA qualifica, registra e apresenta imóveis compatíveis — enquanto seu corretor foca em fechar negócios.
          </p>

          {/* benefícios rápidos */}
          <div className="flex flex-wrap justify-center gap-3 mb-10">
            {[
              '✓ Sem trocar seu ERP',
              '✓ Atendimento 24h/dia',
              '✓ Setup em dias, não meses',
              '✓ Corretor só entra no momento certo',
            ].map(item => (
              <span key={item} className="text-sm text-slate-300 bg-white/5 border border-white/10 px-4 py-1.5 rounded-full">
                {item}
              </span>
            ))}
          </div>

          <Button size="lg" className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-10 shadow-xl shadow-blue-900/40" asChild>
            <Link href="/login">Solicitar uma demonstração do ImovIA <ArrowRight className="h-4 w-4 ml-2" /></Link>
          </Button>

        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────────── */}
      <footer className="border-t bg-[#0F172A] py-12 text-center">
        <div className="flex items-center justify-center gap-2 mb-3">
          <div className="p-1.5 rounded-lg bg-blue-500/20"><Building2 className="h-4 w-4 text-blue-400" /></div>
          <span className="text-sm font-bold text-white">Imov<span className="text-blue-400">IA</span></span>
        </div>
        <p className="text-xs text-slate-600">© {new Date().getFullYear()} ImovIA. Motor de matching para imobiliárias brasileiras.</p>
      </footer>

    </div>
  )
}
