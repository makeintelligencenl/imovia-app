'use client'
import { useEffect, useState } from 'react'
import { Save, Info } from 'lucide-react'

const API = process.env.NEXT_PUBLIC_API_URL

interface Config {
  percentualTotal:   number
  splitImobiliaria:  number
  splitCorretor:     number
}

export default function FinanceiroSettingsPage() {
  const [config, setConfig]   = useState<Config>({ percentualTotal: 6, splitImobiliaria: 50, splitCorretor: 50 })
  const [loading, setLoading] = useState(true)
  const [saving,  setSaving]  = useState(false)
  const [msg,     setMsg]     = useState<{ ok: boolean; text: string } | null>(null)

  useEffect(() => {
    fetch(`${API}/financeiro/config`, { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => {
        setConfig({
          percentualTotal:  Number(d.percentualTotal  ?? 6),
          splitImobiliaria: Number(d.splitImobiliaria ?? 50),
          splitCorretor:    Number(d.splitCorretor    ?? 50),
        })
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  function handleSplit(field: 'splitImobiliaria' | 'splitCorretor', value: number) {
    const other = 100 - value
    if (value < 0 || value > 100) return
    setConfig((c) => ({
      ...c,
      [field]: value,
      [field === 'splitImobiliaria' ? 'splitCorretor' : 'splitImobiliaria']: other,
    }))
  }

  async function save() {
    setSaving(true)
    setMsg(null)
    try {
      const r = await fetch(`${API}/financeiro/config`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
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

  const valorExemplo = (100_000 * config.percentualTotal) / 100
  const parteImob    = (valorExemplo * config.splitImobiliaria) / 100
  const parteCorr    = (valorExemplo * config.splitCorretor)    / 100

  return (
    <div className="max-w-lg space-y-8">
      {/* ── Comissão total ── */}
      <section className="space-y-4">
        <div>
          <h2 className="text-base font-semibold">Percentual de comissão</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Percentual sobre o valor do imóvel cobrado na venda.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-[160px]">
            <input
              type="number"
              min={0}
              max={20}
              step={0.1}
              value={config.percentualTotal}
              onChange={(e) => setConfig((c) => ({ ...c, percentualTotal: Number(e.target.value) }))}
              className="w-full rounded-md border border-input bg-background px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">%</span>
          </div>
          <span className="text-sm text-muted-foreground">sobre o valor do imóvel</span>
        </div>
      </section>

      {/* ── Split ── */}
      <section className="space-y-4">
        <div>
          <h2 className="text-base font-semibold">Divisão da comissão</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Como o total é dividido entre imobiliária e corretor. A soma deve ser 100%.
          </p>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <label className="w-36 text-sm text-muted-foreground">Imobiliária</label>
            <div className="relative w-32">
              <input
                type="number"
                min={0}
                max={100}
                step={1}
                value={config.splitImobiliaria}
                onChange={(e) => handleSplit('splitImobiliaria', Number(e.target.value))}
                className="w-full rounded-md border border-input bg-background px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">%</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <label className="w-36 text-sm text-muted-foreground">Corretor</label>
            <div className="relative w-32">
              <input
                type="number"
                min={0}
                max={100}
                step={1}
                value={config.splitCorretor}
                onChange={(e) => handleSplit('splitCorretor', Number(e.target.value))}
                className="w-full rounded-md border border-input bg-background px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">%</span>
            </div>
          </div>

          {/* Barra visual */}
          <div className="h-3 rounded-full overflow-hidden flex mt-1">
            <div
              className="bg-blue-500 transition-all"
              style={{ width: `${config.splitImobiliaria}%` }}
            />
            <div
              className="bg-amber-400 transition-all"
              style={{ width: `${config.splitCorretor}%` }}
            />
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
          &ensp;|&ensp;
          Corretor: <strong>R$ {parteCorr.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
        </p>
      </section>

      {/* ── Ação ── */}
      {msg && (
        <p className={`text-sm ${msg.ok ? 'text-green-600' : 'text-red-500'}`}>{msg.text}</p>
      )}

      <button
        onClick={save}
        disabled={saving || config.splitImobiliaria + config.splitCorretor !== 100}
        className="flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        <Save className="h-4 w-4" />
        {saving ? 'Salvando…' : 'Salvar configurações'}
      </button>
      {config.splitImobiliaria + config.splitCorretor !== 100 && (
        <p className="text-xs text-red-500">A soma das partes deve ser 100%.</p>
      )}
    </div>
  )
}
