'use client'
import { useEffect, useState } from 'react'
import { X, CheckCircle, AlertTriangle, Info } from 'lucide-react'
import { api } from '@/lib/api'

export interface FecharVendaData {
  matchId:   string
  etapaId:   string
  imovelId?: string
}

interface DadosFechamento {
  imovelTitulo:     string
  imovelFinalidade: string
  corretorNome:     string | null
  valorImovel:      number
  comissao: {
    percentualTotal:  number
    percImobiliaria:  number
    percCorretor:     number
    valorImobiliaria: number
    valorCorretor:    number
  }
}

interface Props {
  data:      FecharVendaData | null
  onConfirm: (matchId: string, etapaId: string) => void
  onCancel:  () => void
}

function fmt(n: number) {
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function FecharVendaModal({ data, onConfirm, onCancel }: Props) {
  const [dados,      setDados]      = useState<DadosFechamento | null>(null)
  const [loading,    setLoading]    = useState(false)
  const [saving,     setSaving]     = useState(false)
  const [error,      setError]      = useState('')

  const [valorImovel,    setValorImovel]    = useState(0)
  const [valorImovelStr, setValorImovelStr] = useState('')
  // percentuais como inteiros
  const [percImob, setPercImob]       = useState(0)
  const [percCorr, setPercCorr]       = useState(0)

  useEffect(() => {
    if (!data) { setDados(null); return }
    setLoading(true)
    setError('')
    api.get<DadosFechamento>(`/financeiro/fechamento/${data.matchId}`)
      .then((d) => {
        setDados(d)
        setValorImovel(d.valorImovel)
        setValorImovelStr(fmt(d.valorImovel))
        setPercImob(Math.round(d.comissao.percImobiliaria))
        setPercCorr(Math.round(d.comissao.percCorretor))
      })
      .catch(() => setError('Erro ao carregar dados do fechamento.'))
      .finally(() => setLoading(false))
  }, [data])

  if (!data) return null

  // R$ calculados sempre a partir de % * valor (somente leitura)
  const valImob = valorImovel * percImob / 100
  const valCorr = valorImovel * percCorr / 100
  const totalPerc   = percImob + percCorr
  const configTotal = dados?.comissao.percentualTotal ?? 0
  const diffAlerta  = totalPerc !== configTotal
  const isVenda     = dados?.imovelFinalidade === 'VENDA'

  function handlePercImob(v: number) {
    const imob = Math.max(0, Math.round(v))
    setPercImob(imob)
  }

  function handlePercCorr(v: number) {
    const corr = Math.max(0, Math.round(v))
    setPercCorr(corr)
  }

  async function handleConfirm() {
    if (!data) return
    setSaving(true)
    setError('')
    try {
      await api.post('/financeiro/fechar-venda', {
        matchId:          data.matchId,
        etapaId:          data.etapaId,
        valorImovel,
        percImobiliaria:  percImob,
        valorImobiliaria: valImob,
        percCorretor:     percCorr,
        valorCorretor:    valCorr,
      })
      onConfirm(data.matchId, data.etapaId)
    } catch {
      setError('Erro ao registrar fechamento. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onCancel() }}
    >
      <div className="bg-background border border-border rounded-xl w-full max-w-md shadow-lg">

        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-border">
          <div>
            <p className="font-medium text-base">Confirmar fechamento</p>
            {dados && (
              <p className="text-sm text-muted-foreground mt-0.5 line-clamp-1">{dados.imovelTitulo}</p>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            {isVenda && (
              <span className="text-xs bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-400 px-2.5 py-1 rounded-md font-medium">
                VENDA
              </span>
            )}
            <button onClick={onCancel} className="text-muted-foreground hover:text-foreground transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-5 space-y-5">
          {loading && (
            <p className="text-sm text-muted-foreground text-center py-6">Carregando…</p>
          )}

          {!loading && dados && (
            <>
              {/* Valor do imóvel */}
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground">Valor do imóvel</label>
                <div className="flex items-center gap-2 border border-input rounded-lg px-3 py-2 focus-within:ring-2 focus-within:ring-blue-500">
                  <span className="text-sm text-muted-foreground">R$</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={valorImovelStr}
                    onChange={(e) => {
                      setValorImovelStr(e.target.value)
                      const raw = parseFloat(e.target.value.replace(/\./g, '').replace(',', '.')) || 0
                      setValorImovel(raw)
                    }}
                    onBlur={() => setValorImovelStr(fmt(valorImovel))}
                    className="flex-1 bg-transparent text-sm font-medium focus:outline-none"
                  />
                </div>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Info className="h-3 w-3" />
                  Edite se o valor negociado for diferente do cadastro.
                </p>
              </div>

              {/* Comissões */}
              {isVenda && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900 px-4 py-3">
                    <p className="text-sm font-medium text-blue-800 dark:text-blue-300">Comissão da venda</p>
                    <div className="text-right">
                      <p className="text-lg font-semibold text-blue-700 dark:text-blue-300">R$ {fmt(valImob + valCorr)}</p>
                      <p className="text-xs text-blue-500 dark:text-blue-400">{totalPerc}% sobre o valor do imóvel</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {/* Imobiliária */}
                    <div className="bg-secondary/50 rounded-lg p-3 space-y-2">
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">Imobiliária</p>
                      <div className="flex items-center gap-1">
                        <input
                          type="number" min={0} max={20} step={1}
                          value={percImob}
                          onChange={(e) => handlePercImob(Number(e.target.value))}
                          className="w-16 bg-background border border-input rounded px-2 py-1 text-sm font-medium text-right focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <span className="text-xs text-muted-foreground">%</span>
                      </div>
                      <p className="text-xs text-muted-foreground">R$ {fmt(valImob)}</p>
                    </div>

                    {/* Corretor */}
                    <div className="bg-secondary/50 rounded-lg p-3 space-y-2">
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">
                        Corretor{dados.corretorNome ? ` · ${dados.corretorNome.split(' ')[0]}` : ''}
                      </p>
                      <div className="flex items-center gap-1">
                        <input
                          type="number" min={0} max={20} step={1}
                          value={percCorr}
                          onChange={(e) => handlePercCorr(Number(e.target.value))}
                          className="w-16 bg-background border border-input rounded px-2 py-1 text-sm font-medium text-right focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <span className="text-xs text-muted-foreground">%</span>
                      </div>
                      <p className="text-xs text-muted-foreground">R$ {fmt(valCorr)}</p>
                    </div>
                  </div>

                  {/* Barra visual */}
                  <div className="h-2 rounded-full overflow-hidden flex">
                    <div className="bg-blue-500 transition-all" style={{ width: `${totalPerc > 0 ? percImob / totalPerc * 100 : 50}%` }} />
                    <div className="bg-amber-400 transition-all" style={{ width: `${totalPerc > 0 ? percCorr / totalPerc * 100 : 50}%` }} />
                  </div>

                  {diffAlerta && (
                    <div className="flex items-center gap-2 bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800 rounded-lg px-3 py-2 text-xs text-yellow-700 dark:text-yellow-400">
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                      Soma ({totalPerc}%) difere do padrão configurado ({configTotal}%).
                    </div>
                  )}
                </div>
              )}

              {!isVenda && (
                <div className="flex items-center gap-2 bg-secondary/50 rounded-lg px-3 py-2.5 text-sm text-muted-foreground">
                  <Info className="h-4 w-4 shrink-0" />
                  Imóvel de {dados.imovelFinalidade?.toLowerCase()}. Comissões não se aplicam.
                </div>
              )}
            </>
          )}

          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-5 pb-5">
          <button
            onClick={onCancel}
            disabled={saving}
            className="px-4 py-2 text-sm rounded-lg border border-border hover:bg-secondary transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={saving || loading || !!error}
            className="flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            <CheckCircle className="h-4 w-4" />
            {saving ? 'Salvando…' : 'Confirmar fechamento'}
          </button>
        </div>
      </div>
    </div>
  )
}
