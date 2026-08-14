'use client'
import { useEffect, useState } from 'react'
import { Save, Info } from 'lucide-react'

const API = process.env.NEXT_PUBLIC_API_URL

interface Config {
  percentualTotal: number
  percImobiliaria: number
  percCorretor:    number
}

function round2(n: number) {
  return Math.round(n * 100) / 100
}

interface ConfigAluguel {
  comissaoTipo:     'TAXA_UNICA' | 'MENSAL' | 'AMBOS'
  percTaxaUnica:    number
  splitImobiliaria: number
  splitCorretor:    number
}

export default function FinanceiroSettingsPage() {
  const [config, setConfig]   = useState<Config>({ percentualTotal: 6, percImobiliaria: 3, percCorretor: 3 })
  const [loading, setLoading] = useState(true)
  const [saving,  setSaving]  = useState(false)
  const [msg,     setMsg]     = useState<{ ok: boolean; text: string } | null>(null)

  const [configAluguel, setConfigAluguel] = useState<ConfigAluguel>({
    comissaoTipo:     'TAXA_UNICA',
    percTaxaUnica:    100,
    splitImobiliaria: 50,
    splitCorretor:    50,
  })
  const [savingAluguel, setSavingAluguel] = useState(false)
  const [msgAluguel, setMsgAluguel]       = useState<{ ok: boolean; text: string } | null>(null)

  useEffect(() => {
    Promise.all([
      fetch(`${API}/financeiro/config`, { credentials: 'include' }).then((r) => r.json()),
      fetch(`${API}/financeiro/config/aluguel`, { credentials: 'include' }).then((r) => r.json()),
    ])
      .then(([d, da]) => {
        const total = Number(d.percentualTotal  ?? 6)
        const splitI = Number(d.splitImobiliaria ?? 50)
        const splitC = Number(d.splitCorretor    ?? 50)
        setConfig({
          percentualTotal: total,
          percImobiliaria: round2(total * splitI / 100),
          percCorretor:    round2(total * splitC / 100),
        })
        if (da && !da.error) {
          setConfigAluguel({
            comissaoTipo:     da.comissaoTipo     ?? 'TAXA_UNICA',
            percTaxaUnica:    Number(da.percTaxaUnica    ?? 100),
            splitImobiliaria: Number(da.splitImobiliaria ?? 50),
            splitCorretor:    Number(da.splitCorretor    ?? 50),
          })
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  function handleTotalChange(total: number) {
    const t = Math.round(total)
    // Mantém a proporção atual; imobiliária arredondada, corretor = resto exato
    const somaAtual = config.percImobiliaria + config.percCorretor || 1
    const novaImob = Math.round(t * config.percImobiliaria / somaAtual)
    const novaCorr = t - novaImob
    setConfig({ percentualTotal: t, percImobiliaria: novaImob, percCorretor: novaCorr })
  }

  function handlePercImob(v: number) {
    const imob = Math.round(v)
    setConfig((c) => ({ ...c, percImobiliaria: imob, percCorretor: Math.round(c.percentualTotal) - imob }))
  }

  function handlePercCorr(v: number) {
    const corr = Math.round(v)
    setConfig((c) => ({ ...c, percCorretor: corr, percImobiliaria: Math.round(c.percentualTotal) - corr }))
  }

  async function saveAluguel(e: React.FormEvent) {
    e.preventDefault()
    setSavingAluguel(true)
    setMsgAluguel(null)
    try {
      const r = await fetch(`${API}/financeiro/config/aluguel`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(configAluguel),
      })
      if (!r.ok) throw new Error()
      setMsgAluguel({ ok: true, text: 'Configuração de aluguel salva com sucesso.' })
    } catch {
      setMsgAluguel({ ok: false, text: 'Erro ao salvar. Tente novamente.' })
    } finally {
      setSavingAluguel(false)
    }
  }

  async function save() {
    setSaving(true)
    setMsg(null)
    try {
      const splitI = config.percentualTotal > 0
        ? round2(config.percImobiliaria / config.percentualTotal * 100)
        : 50
      const splitC = 100 - splitI
      const r = await fetch(`${API}/financeiro/config`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          percentualTotal:  config.percentualTotal,
          splitImobiliaria: splitI,
          splitCorretor:    splitC,
        }),
      })
      if (!r.ok) throw new Error()
      setMsg({ ok: true, text: 'Configurações salvas com sucesso.' })
    } catch {
      setMsg({ ok: false, text: 'Erro ao salvar. Tente novamente.' })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="text-sm text-muted-foreground py-8 text-center">Carregando…</div>
  }

  const soma        = round2(config.percImobiliaria + config.percCorretor)
  const somaOk      = soma === config.percentualTotal
  const valorExemplo = (100_000 * config.percentualTotal) / 100
  const parteImob   = (100_000 * config.percImobiliaria)  / 100
  const parteCorr   = (100_000 * config.percCorretor)     / 100
  const barImob     = config.percentualTotal > 0 ? config.percImobiliaria / config.percentualTotal * 100 : 50

  return (
    <div className="max-w-lg space-y-8">

      {/* ── Comissão total ── */}
      <section className="space-y-4">
        <div>
          <h2 className="text-base font-semibold">Percentual de comissão</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Percentual total cobrado sobre o valor do imóvel na venda.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative max-w-[160px]">
            <input
              type="number" min={0} max={20} step={1}
              value={config.percentualTotal}
              onChange={(e) => handleTotalChange(Math.round(Number(e.target.value)))}
              className="w-full rounded-md border border-input bg-background px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">%</span>
          </div>
          <span className="text-sm text-muted-foreground">sobre o valor do imóvel</span>
        </div>
      </section>

      {/* ── Divisão ── */}
      <section className="space-y-4">
        <div>
          <h2 className="text-base font-semibold">Divisão da comissão</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Informe quantos % cabem a cada parte. A soma deve ser igual ao total ({config.percentualTotal}%).
          </p>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <label className="w-36 text-sm text-muted-foreground">Imobiliária</label>
            <div className="relative w-32">
              <input
                type="number" min={0} max={config.percentualTotal} step={1}
                value={config.percImobiliaria}
                onChange={(e) => handlePercImob(Math.round(Number(e.target.value)))}
                className="w-full rounded-md border border-input bg-background px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">%</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <label className="w-36 text-sm text-muted-foreground">Corretor</label>
            <div className="relative w-32">
              <input
                type="number" min={0} max={config.percentualTotal} step={1}
                value={config.percCorretor}
                onChange={(e) => handlePercCorr(Math.round(Number(e.target.value)))}
                className="w-full rounded-md border border-input bg-background px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">%</span>
            </div>
          </div>

          {/* Soma */}
          <div className={`flex items-center gap-2 text-xs ${somaOk ? 'text-muted-foreground' : 'text-red-500'}`}>
            <span>Soma: {soma}%</span>
            {!somaOk && <span>— deve ser {config.percentualTotal}%</span>}
          </div>

          {/* Barra visual */}
          <div className="h-3 rounded-full overflow-hidden flex mt-1">
            <div className="bg-blue-500 transition-all" style={{ width: `${barImob}%` }} />
            <div className="bg-amber-400 transition-all" style={{ width: `${100 - barImob}%` }} />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" />
              Imobiliária
            </span>
            <span className="flex items-center gap-1">
              Corretor
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" />
            </span>
          </div>
        </div>
      </section>

      {/* ── Exemplo ── */}
      <section className="rounded-lg border border-blue-100 bg-blue-50 p-4 text-sm space-y-1 dark:border-blue-900 dark:bg-blue-950/30">
        <p className="flex items-center gap-1.5 font-medium text-blue-700 dark:text-blue-400">
          <Info className="h-4 w-4" />
          Exemplo — imóvel de R$ 100.000
        </p>
        <p className="text-muted-foreground">
          Comissão total: <strong>R$ {valorExemplo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
          &nbsp;({config.percentualTotal}%)
        </p>
        <p className="text-muted-foreground">
          Imobiliária: <strong>R$ {parteImob.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
          &nbsp;({config.percImobiliaria}%)
          &ensp;|&ensp;
          Corretor: <strong>R$ {parteCorr.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
          &nbsp;({config.percCorretor}%)
        </p>
      </section>

      {msg && (
        <p className={`text-sm ${msg.ok ? 'text-green-600' : 'text-red-500'}`}>{msg.text}</p>
      )}

      <button
        onClick={save}
        disabled={saving || !somaOk}
        className="flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        <Save className="h-4 w-4" />
        {saving ? 'Salvando…' : 'Salvar configurações'}
      </button>

      {/* ── Comissão de Aluguel ── */}
      <hr className="border-border" />

      <section className="space-y-4">
        <div>
          <h2 className="text-base font-semibold">Comissão de Aluguel</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Configuração da comissão cobrada nas locações.
          </p>
        </div>

        <form onSubmit={saveAluguel} className="space-y-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Tipo de comissão</label>
            <select
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={configAluguel.comissaoTipo}
              onChange={(e) => setConfigAluguel((p) => ({ ...p, comissaoTipo: e.target.value as ConfigAluguel['comissaoTipo'] }))}
            >
              <option value="TAXA_UNICA">Taxa única no fechamento</option>
              <option value="MENSAL">Percentual mensal recorrente</option>
              <option value="AMBOS">Ambos</option>
            </select>
          </div>

          {(configAluguel.comissaoTipo === 'TAXA_UNICA' || configAluguel.comissaoTipo === 'AMBOS') && (
            <div>
              <label className="text-xs font-medium text-muted-foreground">
                Taxa única (% sobre 1º mês)
              </label>
              <div className="relative max-w-[160px]">
                <input
                  type="number" min={0} max={200} step={0.5}
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={configAluguel.percTaxaUnica}
                  onChange={(e) => setConfigAluguel((p) => ({ ...p, percTaxaUnica: Number(e.target.value) }))}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">%</span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Split Imobiliária (%)</label>
              <div className="relative">
                <input
                  type="number" min={0} max={100} step={1}
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={configAluguel.splitImobiliaria}
                  onChange={(e) => setConfigAluguel((p) => ({ ...p, splitImobiliaria: Number(e.target.value) }))}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">%</span>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Split Corretor (%)</label>
              <div className="relative">
                <input
                  type="number" min={0} max={100} step={1}
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={configAluguel.splitCorretor}
                  onChange={(e) => setConfigAluguel((p) => ({ ...p, splitCorretor: Number(e.target.value) }))}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">%</span>
              </div>
            </div>
          </div>

          {msgAluguel && (
            <p className={`text-sm ${msgAluguel.ok ? 'text-green-600' : 'text-red-500'}`}>{msgAluguel.text}</p>
          )}

          <button
            type="submit"
            disabled={savingAluguel}
            className="flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Save className="h-4 w-4" />
            {savingAluguel ? 'Salvando…' : 'Salvar configuração de aluguel'}
          </button>
        </form>
      </section>
    </div>
  )
}
