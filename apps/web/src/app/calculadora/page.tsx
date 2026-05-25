'use client'
import { useState, useMemo } from 'react'
import { Building2, TrendingUp, Users, MessageCircle, DollarSign, Info } from 'lucide-react'

const GPT_PLANS = [
  { nome: 'Basic',     preco: 87,   creditos: 2500  },
  { nome: 'Standard',  preco: 397,  creditos: 11500 },
  { nome: 'Corporate', preco: 997,  creditos: 30000 },
]

const IMOVIA_PLANS = [
  { nome: 'Starter',    preco: 197 },
  { nome: 'Pro',        preco: 397 },
  { nome: 'Business',   preco: 697 },
]

function fmt(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function pct(v: number) {
  return `${v.toFixed(1)}%`
}

export default function CalculadoraPage() {
  const [clientes,        setClientes]        = useState(5)
  const [leadsPorCliente, setLeadsPorCliente] = useState(100)
  const [creditosPorChat, setCreditosPorChat] = useState(25)
  const [gptPlanIdx,      setGptPlanIdx]      = useState(0)
  const [imoviaPlanIdx,   setImoviaPlanIdx]   = useState(0)
  const [infra,           setInfra]           = useState(15)

  const gptPlan    = GPT_PLANS[gptPlanIdx]
  const imoviaPlan = IMOVIA_PLANS[imoviaPlanIdx]

  const calc = useMemo(() => {
    const totalLeads       = clientes * leadsPorCliente
    const creditosNecessarios = totalLeads * creditosPorChat
    const custoPorCredito  = gptPlan.preco / gptPlan.creditos
    const custoGpt         = Math.min(creditosNecessarios, gptPlan.creditos) * custoPorCredito
    const custoTotal       = custoGpt + infra
    const receita          = clientes * imoviaPlan.preco
    const margem           = receita - custoTotal
    const margemPct        = receita > 0 ? (margem / receita) * 100 : 0
    const capacidadeLeads  = Math.floor(gptPlan.creditos / creditosPorChat)
    const suporta          = totalLeads <= capacidadeLeads
    const custoPorLead     = totalLeads > 0 ? custoTotal / totalLeads : 0
    const breakeven        = custoTotal > 0 ? Math.ceil(custoTotal / imoviaPlan.preco) : 0

    return { totalLeads, creditosNecessarios, custoPorCredito, custoGpt, custoTotal, receita, margem, margemPct, capacidadeLeads, suporta, custoPorLead, breakeven }
  }, [clientes, leadsPorCliente, creditosPorChat, gptPlanIdx, imoviaPlanIdx, infra])

  const margemColor = calc.margemPct >= 60 ? 'text-emerald-400' : calc.margemPct >= 30 ? 'text-amber-400' : 'text-red-400'

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
          <p className="text-slate-400 mt-1 text-sm">Simule receita, custos e margem do seu SaaS ImovIA</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* ── Inputs ── */}
          <div className="space-y-5">

            {/* Clientes */}
            <div className="bg-white/5 rounded-xl p-5 space-y-4">
              <h2 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                <Users className="h-4 w-4 text-blue-400" /> Clientes e Leads
              </h2>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between mb-1">
                    <label className="text-xs text-slate-400">Número de imobiliárias</label>
                    <span className="text-xs font-bold text-white">{clientes}</span>
                  </div>
                  <input type="range" min={1} max={50} value={clientes}
                    onChange={e => setClientes(+e.target.value)}
                    className="w-full accent-blue-500" />
                  <div className="flex justify-between text-[10px] text-slate-600 mt-0.5">
                    <span>1</span><span>50</span>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between mb-1">
                    <label className="text-xs text-slate-400">Leads por imobiliária/mês</label>
                    <span className="text-xs font-bold text-white">{leadsPorCliente}</span>
                  </div>
                  <input type="range" min={10} max={500} step={10} value={leadsPorCliente}
                    onChange={e => setLeadsPorCliente(+e.target.value)}
                    className="w-full accent-blue-500" />
                  <div className="flex justify-between text-[10px] text-slate-600 mt-0.5">
                    <span>10</span><span>500</span>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between mb-1">
                    <label className="text-xs text-slate-400">Créditos por conversa</label>
                    <span className="text-xs font-bold text-white">{creditosPorChat}</span>
                  </div>
                  <input type="range" min={10} max={50} value={creditosPorChat}
                    onChange={e => setCreditosPorChat(+e.target.value)}
                    className="w-full accent-blue-500" />
                  <div className="flex justify-between text-[10px] text-slate-600 mt-0.5">
                    <span>10</span><span>50</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Planos */}
            <div className="bg-white/5 rounded-xl p-5 space-y-4">
              <h2 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-blue-400" /> Planos
              </h2>

              <div>
                <label className="text-xs text-slate-400 mb-2 block">Plano GPT Maker</label>
                <div className="grid grid-cols-3 gap-2">
                  {GPT_PLANS.map((p, i) => (
                    <button key={p.nome} onClick={() => setGptPlanIdx(i)}
                      className={`rounded-lg p-3 text-left border transition-all ${i === gptPlanIdx ? 'border-blue-500 bg-blue-500/10' : 'border-white/10 bg-white/5 hover:bg-white/10'}`}>
                      <p className="text-xs font-semibold">{p.nome}</p>
                      <p className="text-[11px] text-slate-400">{fmt(p.preco)}/mês</p>
                      <p className="text-[10px] text-slate-500">{p.creditos.toLocaleString('pt-BR')} cr</p>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-400 mb-2 block">Plano ImovIA cobrado do cliente</label>
                <div className="grid grid-cols-3 gap-2">
                  {IMOVIA_PLANS.map((p, i) => (
                    <button key={p.nome} onClick={() => setImoviaPlanIdx(i)}
                      className={`rounded-lg p-3 text-left border transition-all ${i === imoviaPlanIdx ? 'border-emerald-500 bg-emerald-500/10' : 'border-white/10 bg-white/5 hover:bg-white/10'}`}>
                      <p className="text-xs font-semibold">{p.nome}</p>
                      <p className="text-[11px] text-slate-400">{fmt(p.preco)}/mês</p>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <label className="text-xs text-slate-400">Custo de infraestrutura (Railway)</label>
                  <span className="text-xs font-bold text-white">{fmt(infra)}</span>
                </div>
                <input type="range" min={5} max={100} step={5} value={infra}
                  onChange={e => setInfra(+e.target.value)}
                  className="w-full accent-blue-500" />
              </div>
            </div>
          </div>

          {/* ── Resultados ── */}
          <div className="space-y-4">

            {/* Margem destaque */}
            <div className="bg-white/5 rounded-xl p-6 text-center border border-white/10">
              <p className="text-xs text-slate-400 mb-1">Margem bruta mensal</p>
              <p className={`text-5xl font-bold ${margemColor}`}>{pct(calc.margemPct)}</p>
              <p className="text-lg font-semibold text-white mt-1">{fmt(calc.margem)}</p>
              <div className="mt-3 h-2 rounded-full bg-white/10 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${calc.margemPct >= 60 ? 'bg-emerald-500' : calc.margemPct >= 30 ? 'bg-amber-500' : 'bg-red-500'}`}
                  style={{ width: `${Math.max(0, Math.min(100, calc.margemPct))}%` }}
                />
              </div>
            </div>

            {/* Cards de métricas */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white/5 rounded-xl p-4">
                <p className="text-[11px] text-slate-400">Receita total</p>
                <p className="text-lg font-bold text-emerald-400">{fmt(calc.receita)}</p>
                <p className="text-[10px] text-slate-500">{clientes} × {fmt(imoviaPlan.preco)}</p>
              </div>
              <div className="bg-white/5 rounded-xl p-4">
                <p className="text-[11px] text-slate-400">Custo total</p>
                <p className="text-lg font-bold text-red-400">{fmt(calc.custoTotal)}</p>
                <p className="text-[10px] text-slate-500">GPT + infra</p>
              </div>
              <div className="bg-white/5 rounded-xl p-4">
                <p className="text-[11px] text-slate-400">Custo por lead</p>
                <p className="text-lg font-bold text-white">{fmt(calc.custoPorLead)}</p>
                <p className="text-[10px] text-slate-500">{calc.totalLeads} leads/mês</p>
              </div>
              <div className="bg-white/5 rounded-xl p-4">
                <p className="text-[11px] text-slate-400">Break-even</p>
                <p className="text-lg font-bold text-white">{calc.breakeven} cliente{calc.breakeven !== 1 ? 's' : ''}</p>
                <p className="text-[10px] text-slate-500">para cobrir custos</p>
              </div>
            </div>

            {/* Capacidade GPT Maker */}
            <div className={`rounded-xl p-4 border ${calc.suporta ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
              <div className="flex items-start gap-2">
                <MessageCircle className={`h-4 w-4 mt-0.5 shrink-0 ${calc.suporta ? 'text-emerald-400' : 'text-red-400'}`} />
                <div>
                  <p className={`text-xs font-semibold ${calc.suporta ? 'text-emerald-400' : 'text-red-400'}`}>
                    {calc.suporta ? 'Plano GPT Maker suporta o volume' : 'Plano GPT Maker insuficiente'}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Necessário: <strong className="text-white">{calc.creditosNecessarios.toLocaleString('pt-BR')} créditos</strong> —
                    Disponível: <strong className="text-white">{gptPlan.creditos.toLocaleString('pt-BR')} créditos</strong>
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Capacidade: até <strong className="text-white">{calc.capacidadeLeads.toLocaleString('pt-BR')}</strong> conversas/mês
                  </p>
                </div>
              </div>
            </div>

            {/* Detalhamento de custos */}
            <div className="bg-white/5 rounded-xl p-4 space-y-2">
              <p className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <TrendingUp className="h-3.5 w-3.5 text-blue-400" /> Detalhamento
              </p>
              {[
                { label: 'GPT Maker', valor: calc.custoGpt, cor: 'text-slate-300' },
                { label: 'Infraestrutura (Railway)', valor: infra, cor: 'text-slate-300' },
                { label: 'Custo total', valor: calc.custoTotal, cor: 'text-red-400' },
                { label: 'Receita bruta', valor: calc.receita, cor: 'text-emerald-400' },
                { label: 'Margem bruta', valor: calc.margem, cor: calc.margem >= 0 ? 'text-emerald-400' : 'text-red-400' },
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
