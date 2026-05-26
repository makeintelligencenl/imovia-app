'use client'
import { useState, useMemo } from 'react'
import { Building2, TrendingUp, Users, MessageCircle, DollarSign, Target, Zap } from 'lucide-react'

const GPT_PLANS = [
  { nome: 'Basic',     preco: 87,   creditos: 2500  },
  { nome: 'Standard',  preco: 397,  creditos: 11500 },
  { nome: 'Corporate', preco: 997,  creditos: 30000 },
]

function fmt(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function num(v: number, decimais = 0) {
  return v.toLocaleString('pt-BR', { maximumFractionDigits: decimais })
}

function pct(v: number) {
  return `${v.toFixed(1)}%`
}

function Slider({
  label, value, min, max, step = 1, onChange, suffix = '', minLabel, maxLabel,
}: {
  label: string; value: number; min: number; max: number; step?: number
  onChange: (v: number) => void; suffix?: string; minLabel?: string; maxLabel?: string
}) {
  return (
    <div>
      <div className="flex justify-between mb-1">
        <label className="text-xs text-slate-400">{label}</label>
        <span className="text-xs font-bold text-white">{num(value)}{suffix}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(+e.target.value)}
        className="w-full accent-blue-500" />
      <div className="flex justify-between text-[10px] text-slate-600 mt-0.5">
        <span>{minLabel ?? min}{suffix}</span>
        <span>{maxLabel ?? max}{suffix}</span>
      </div>
    </div>
  )
}

function CalcBadge({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between bg-blue-500/10 border border-blue-500/20 rounded-lg px-3 py-2">
      <span className="text-[11px] text-blue-300">{label}</span>
      <span className="text-xs font-bold text-blue-200">{value}</span>
    </div>
  )
}

export default function CalculadoraPage() {
  // ── Volume do agente (por imobiliária) ──
  const [clientesPorDia,      setClientesPorDia]      = useState(5)
  const [mensagensPorCliente, setMensagensPorCliente] = useState(20)
  const [diasTrabalho,        setDiasTrabalho]        = useState(8)

  // ── Custos ──
  const [creditosPorMensagem, setCreditosPorMensagem] = useState(2)
  const [gptPlanIdx,          setGptPlanIdx]          = useState(0)
  const [infra,               setInfra]               = useState(15)

  // ── Negócio ──
  const [numImobiliarias,  setNumImobiliarias]  = useState(5)
  const [margemDesejada,   setMargemDesejada]   = useState(50)

  const gptPlan = GPT_PLANS[gptPlanIdx]

  const calc = useMemo(() => {
    // Volume por imobiliária
    const mensagensPorDia = clientesPorDia * mensagensPorCliente
    const mensagensPorMes = mensagensPorDia * diasTrabalho
    const conversasPorMes = clientesPorDia * diasTrabalho   // 1 cliente = 1 conversa

    // Volume total (todas as imobiliárias)
    const totalMensagens   = mensagensPorMes * numImobiliarias
    const totalConversas   = conversasPorMes * numImobiliarias
    const creditosNecessarios = totalMensagens * creditosPorMensagem

    // Custos
    const custoPorCredito = gptPlan.preco / gptPlan.creditos
    const custoGpt        = Math.min(creditosNecessarios, gptPlan.creditos) * custoPorCredito
    const custoTotal      = custoGpt + infra

    // Capacidade do plano
    const capacidadeMensagens = Math.floor(gptPlan.creditos / creditosPorMensagem)
    const suporta             = creditosNecessarios <= gptPlan.creditos

    // Precificação
    const fatorMargem  = 1 - margemDesejada / 100
    const precoIdeal   = fatorMargem > 0 ? custoTotal / (numImobiliarias * fatorMargem) : 0
    const receita      = numImobiliarias * precoIdeal
    const margemReal   = receita > 0 ? ((receita - custoTotal) / receita) * 100 : 0
    const custoPorimob = numImobiliarias > 0 ? custoTotal / numImobiliarias : 0
    const breakeven    = precoIdeal > 0 ? Math.ceil(custoTotal / precoIdeal) : 0

    return {
      mensagensPorDia, mensagensPorMes, conversasPorMes,
      totalMensagens, totalConversas, creditosNecessarios,
      custoPorCredito, custoGpt, custoTotal,
      capacidadeMensagens, suporta,
      precoIdeal, receita, margemReal, custoPorimob, breakeven,
    }
  }, [clientesPorDia, mensagensPorCliente, diasTrabalho, creditosPorMensagem, gptPlanIdx, infra, numImobiliarias, margemDesejada])

  const precoColor = calc.margemReal >= 60 ? 'text-emerald-400' : calc.margemReal >= 30 ? 'text-amber-400' : 'text-red-400'

  return (
    <div className="min-h-screen bg-[#0F172A] text-white">
      {/* Header */}
      <div className="border-b border-white/10 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center gap-3">
          <div className="p-1.5 rounded-lg bg-blue-500/20">
            <Building2 className="h-5 w-5 text-blue-400" />
          </div>
          <div>
            <span className="text-sm font-semibold text-white tracking-tight">
              Imov<span className="text-blue-400 font-bold">IA</span>
            </span>
            <span className="ml-2 text-sm text-slate-400">— Calculadora de Precificação</span>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-10 space-y-8">
        <div>
          <h1 className="text-2xl font-bold">Calculadora de Margem</h1>
          <p className="text-slate-400 mt-1 text-sm">
            Configure o volume do agente, custos e margem desejada — a calculadora sugere o preço ideal por imobiliária
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* ── Inputs ── */}
          <div className="space-y-5">

            {/* Volume do agente */}
            <div className="bg-white/5 rounded-xl p-5 space-y-4">
              <h2 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                <MessageCircle className="h-4 w-4 text-blue-400" /> Volume do Agente (por imobiliária)
              </h2>
              <div className="space-y-3">
                <Slider label="Clientes atendidos por dia" value={clientesPorDia}
                  min={1} max={50} onChange={setClientesPorDia} />
                <Slider label="Mensagens por cliente" value={mensagensPorCliente}
                  min={5} max={100} step={5} onChange={setMensagensPorCliente} />
                <Slider label="Dias de trabalho do agente/mês" value={diasTrabalho}
                  min={1} max={30} onChange={setDiasTrabalho} />
              </div>

              {/* Calculados */}
              <div className="space-y-2 pt-1">
                <CalcBadge
                  label="Mensagens por dia"
                  value={`${num(calc.mensagensPorDia)} msg/dia`}
                />
                <CalcBadge
                  label="Mensagens por mês"
                  value={`${num(calc.mensagensPorMes)} msg/mês`}
                />
              </div>
            </div>

            {/* Custos */}
            <div className="bg-white/5 rounded-xl p-5 space-y-4">
              <h2 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-blue-400" /> Custos
              </h2>

              <Slider label="Créditos por mensagem (GPT Maker)" value={creditosPorMensagem}
                min={1} max={10} onChange={setCreditosPorMensagem} suffix=" cr" />

              <div>
                <label className="text-xs text-slate-400 mb-2 block">Plano GPT Maker</label>
                <div className="grid grid-cols-3 gap-2">
                  {GPT_PLANS.map((p, i) => (
                    <button key={p.nome} onClick={() => setGptPlanIdx(i)}
                      className={`rounded-lg p-3 text-left border transition-all ${i === gptPlanIdx
                        ? 'border-blue-500 bg-blue-500/10'
                        : 'border-white/10 bg-white/5 hover:bg-white/10'}`}>
                      <p className="text-xs font-semibold">{p.nome}</p>
                      <p className="text-[11px] text-slate-400">{fmt(p.preco)}/mês</p>
                      <p className="text-[10px] text-slate-500">{p.creditos.toLocaleString('pt-BR')} cr</p>
                    </button>
                  ))}
                </div>
              </div>

              <Slider label="Infraestrutura (Railway)" value={infra}
                min={5} max={100} step={5} onChange={setInfra}
                suffix="" minLabel="R$5" maxLabel="R$100" />
            </div>

            {/* Precificação */}
            <div className="bg-white/5 rounded-xl p-5 space-y-4">
              <h2 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                <Target className="h-4 w-4 text-blue-400" /> Precificação
              </h2>
              <Slider label="Número de imobiliárias clientes" value={numImobiliarias}
                min={1} max={50} onChange={setNumImobiliarias} />
              <Slider label="Margem desejada" value={margemDesejada}
                min={10} max={90} step={5} onChange={setMargemDesejada} suffix="%" />
            </div>
          </div>

          {/* ── Resultados ── */}
          <div className="space-y-4">

            {/* PREÇO IDEAL — destaque principal */}
            <div className="bg-gradient-to-br from-blue-600/20 to-blue-500/5 rounded-xl p-6 text-center border border-blue-500/30">
              <p className="text-xs text-blue-300 mb-1 uppercase tracking-wider font-semibold">Preço ideal por imobiliária</p>
              <p className="text-5xl font-bold text-white">{fmt(calc.precoIdeal)}</p>
              <p className="text-sm text-slate-400 mt-1">
                com <span className="text-blue-300 font-semibold">{pct(margemDesejada)}</span> de margem
                para <span className="text-blue-300 font-semibold">{numImobiliarias}</span> cliente{numImobiliarias !== 1 ? 's' : ''}
              </p>
              <div className="mt-4 grid grid-cols-2 gap-3 text-left">
                <div className="bg-white/5 rounded-lg p-3">
                  <p className="text-[10px] text-slate-500">Receita projetada</p>
                  <p className="text-sm font-bold text-emerald-400">{fmt(calc.receita)}</p>
                </div>
                <div className="bg-white/5 rounded-lg p-3">
                  <p className="text-[10px] text-slate-500">Custo total</p>
                  <p className="text-sm font-bold text-red-400">{fmt(calc.custoTotal)}</p>
                </div>
              </div>
            </div>

            {/* Cards de métricas */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white/5 rounded-xl p-4">
                <p className="text-[11px] text-slate-400">Custo por imobiliária</p>
                <p className="text-lg font-bold text-white">{fmt(calc.custoPorimob)}</p>
                <p className="text-[10px] text-slate-500">{num(calc.mensagensPorMes)} msg/mês</p>
              </div>
              <div className="bg-white/5 rounded-xl p-4">
                <p className="text-[11px] text-slate-400">Break-even</p>
                <p className="text-lg font-bold text-white">{calc.breakeven} cliente{calc.breakeven !== 1 ? 's' : ''}</p>
                <p className="text-[10px] text-slate-500">para cobrir custos</p>
              </div>
              <div className="bg-white/5 rounded-xl p-4">
                <p className="text-[11px] text-slate-400">Total de mensagens/mês</p>
                <p className="text-lg font-bold text-white">{num(calc.totalMensagens)}</p>
                <p className="text-[10px] text-slate-500">{numImobiliarias} × {num(calc.mensagensPorMes)}</p>
              </div>
              <div className="bg-white/5 rounded-xl p-4">
                <p className="text-[11px] text-slate-400">Créditos necessários</p>
                <p className="text-lg font-bold text-white">{num(calc.creditosNecessarios)}</p>
                <p className="text-[10px] text-slate-500">de {gptPlan.creditos.toLocaleString('pt-BR')} disponíveis</p>
              </div>
            </div>

            {/* Capacidade GPT Maker */}
            <div className={`rounded-xl p-4 border ${calc.suporta
              ? 'bg-emerald-500/10 border-emerald-500/30'
              : 'bg-red-500/10 border-red-500/30'}`}>
              <div className="flex items-start gap-2">
                <Zap className={`h-4 w-4 mt-0.5 shrink-0 ${calc.suporta ? 'text-emerald-400' : 'text-red-400'}`} />
                <div>
                  <p className={`text-xs font-semibold ${calc.suporta ? 'text-emerald-400' : 'text-red-400'}`}>
                    {calc.suporta ? `Plano ${gptPlan.nome} suporta o volume` : `Plano ${gptPlan.nome} insuficiente — upgrade necessário`}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Necessário: <strong className="text-white">{num(calc.creditosNecessarios)} cr</strong>
                    {' '}— Disponível: <strong className="text-white">{gptPlan.creditos.toLocaleString('pt-BR')} cr</strong>
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Capacidade: até <strong className="text-white">{num(calc.capacidadeMensagens)}</strong> mensagens/mês neste plano
                  </p>
                </div>
              </div>
            </div>

            {/* Detalhamento */}
            <div className="bg-white/5 rounded-xl p-4 space-y-2">
              <p className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <TrendingUp className="h-3.5 w-3.5 text-blue-400" /> Detalhamento de Custos
              </p>
              {[
                { label: 'GPT Maker',             valor: calc.custoGpt,   cor: 'text-slate-300' },
                { label: 'Infraestrutura',         valor: infra,           cor: 'text-slate-300' },
                { label: 'Custo total',            valor: calc.custoTotal, cor: 'text-red-400'   },
                { label: 'Receita bruta',          valor: calc.receita,    cor: 'text-emerald-400' },
                { label: `Margem (${pct(calc.margemReal)})`, valor: calc.receita - calc.custoTotal, cor: calc.receita >= calc.custoTotal ? 'text-emerald-400' : 'text-red-400' },
              ].map(({ label, valor, cor }) => (
                <div key={label} className="flex justify-between text-xs">
                  <span className="text-slate-400">{label}</span>
                  <span className={`font-semibold ${cor}`}>{fmt(valor)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-slate-600">
          ImovIA © {new Date().getFullYear()} — Simulação baseada nos planos GPT Maker e Railway atuais
        </p>
      </div>
    </div>
  )
}
