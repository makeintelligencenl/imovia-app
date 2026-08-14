'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { KeyRound, CheckCircle, XCircle } from 'lucide-react'
import { api } from '@/lib/api'
import { getCurrentUser } from '@/lib/auth'

interface Contrato {
  id:                  string
  status:              'ATIVO' | 'ENCERRADO'
  dataInicio:          string
  duracaoMeses:        number
  dataVencimento:      string
  dataEncerramento:    string | null
  valorMensal:         number
  percTaxaUnica:       number | null
  valorTaxaUnicaImob:  number | null
  valorTaxaUnicaCorr:  number | null
  statusTaxaUnica:     'PENDENTE' | 'PAGO'
  dataPagamentoTaxa:   string | null
  imovel:   { id: string; titulo: string; bairro: string; cidade: { nome: string } }
  corretor: { id: string; name: string } | null
  match:    { id: string; perfil: { cliente: { nome: string } } }
}

function fmt(n: number) {
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR')
}

export default function AluguelPage() {
  const router = useRouter()
  const [contratos, setContratos]       = useState<Contrato[]>([])
  const [loading, setLoading]           = useState(true)
  const [filtroStatus, setFiltroStatus] = useState('ATIVO')
  const [encerrando, setEncerrando]     = useState<string | null>(null)
  const [pagando, setPagando]           = useState<string | null>(null)
  const [confirmarId, setConfirmarId]   = useState<string | null>(null)

  useEffect(() => {
    const u = getCurrentUser()
    if (!u || u.role !== 'ADMIN') { router.replace('/dashboard'); return }
  }, [router])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api.get<Contrato[]>(`/aluguel/contratos?status=${filtroStatus}`)
      setContratos(data)
    } catch {
      toast.error('Erro ao carregar contratos')
    } finally {
      setLoading(false)
    }
  }, [filtroStatus])

  useEffect(() => { load() }, [load])

  async function encerrar(id: string) {
    setEncerrando(id)
    try {
      await api.patch(`/aluguel/contratos/${id}/encerrar`, {})
      toast.success('Contrato encerrado. Imóvel voltou para Disponível.')
      setConfirmarId(null)
      await load()
    } catch {
      toast.error('Erro ao encerrar contrato')
    } finally {
      setEncerrando(null)
    }
  }

  async function pagarTaxa(id: string) {
    setPagando(id)
    try {
      await api.patch(`/aluguel/contratos/${id}/pagar-taxa`, {})
      toast.success('Taxa marcada como paga')
      await load()
    } catch {
      toast.error('Erro ao marcar taxa')
    } finally {
      setPagando(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Contratos de Aluguel</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Gestão de imóveis alugados</p>
        </div>

        <div className="flex gap-2">
          {(['ATIVO', 'ENCERRADO'] as const).map(s => (
            <button key={s}
              onClick={() => setFiltroStatus(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                filtroStatus === s
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'border-border text-muted-foreground hover:bg-muted'
              }`}
            >
              {s === 'ATIVO' ? 'Ativos' : 'Encerrados'}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground py-16 text-center">Carregando...</p>
      ) : contratos.length === 0 ? (
        <div className="text-center py-20">
          <KeyRound className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">Nenhum contrato {filtroStatus === 'ATIVO' ? 'ativo' : 'encerrado'}.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {contratos.map(c => (
            <div key={c.id} className="rounded-xl border border-border bg-card shadow-sm">
              <div className="p-5">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">

                  {/* Info principal */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                        c.status === 'ATIVO'
                          ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
                          : 'bg-gray-100 text-gray-500'
                      }`}>
                        {c.status}
                      </span>
                    </div>
                    <p className="font-semibold text-foreground truncate">{c.imovel.titulo}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {c.imovel.bairro}, {c.imovel.cidade.nome}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Cliente: <span className="font-medium text-foreground">{c.match.perfil.cliente.nome}</span>
                      {c.corretor && <> · Corretor: <span className="font-medium text-foreground">{c.corretor.name}</span></>}
                    </p>
                  </div>

                  {/* Valores */}
                  <div className="flex flex-col gap-1 text-right shrink-0">
                    <p className="text-lg font-bold text-foreground">R$ {fmt(c.valorMensal)}<span className="text-xs font-normal text-muted-foreground">/mês</span></p>
                    <p className="text-xs text-muted-foreground">
                      {fmtDate(c.dataInicio)} → {fmtDate(c.dataVencimento)} ({c.duracaoMeses} meses)
                    </p>
                    {c.dataEncerramento && (
                      <p className="text-xs text-muted-foreground">Encerrado em {fmtDate(c.dataEncerramento)}</p>
                    )}
                  </div>
                </div>

                {/* Taxa única */}
                {c.valorTaxaUnicaImob !== null && (
                  <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
                    <div className="text-xs text-muted-foreground">
                      Taxa única — Imob: <span className="font-semibold text-foreground">R$ {fmt(Number(c.valorTaxaUnicaImob))}</span>
                      {c.valorTaxaUnicaCorr !== null && (
                        <> · Corretor: <span className="font-semibold text-foreground">R$ {fmt(Number(c.valorTaxaUnicaCorr))}</span></>
                      )}
                    </div>
                    {c.status === 'ATIVO' && (
                      c.statusTaxaUnica === 'PAGO' ? (
                        <span className="flex items-center gap-1 text-xs text-emerald-600 font-semibold">
                          <CheckCircle className="h-3.5 w-3.5" /> Taxa paga {c.dataPagamentoTaxa ? fmtDate(c.dataPagamentoTaxa) : ''}
                        </span>
                      ) : (
                        <button
                          onClick={() => pagarTaxa(c.id)}
                          disabled={pagando === c.id}
                          className="text-xs font-semibold text-primary hover:underline disabled:opacity-50"
                        >
                          {pagando === c.id ? 'Salvando...' : 'Marcar taxa como paga'}
                        </button>
                      )
                    )}
                  </div>
                )}

                {/* Ação encerrar */}
                {c.status === 'ATIVO' && (
                  <div className="mt-3 flex justify-end">
                    {confirmarId === c.id ? (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">Confirmar encerramento?</span>
                        <button
                          onClick={() => encerrar(c.id)}
                          disabled={encerrando === c.id}
                          className="text-xs font-semibold text-red-600 hover:underline disabled:opacity-50"
                        >
                          {encerrando === c.id ? 'Encerrando...' : 'Sim, encerrar'}
                        </button>
                        <button
                          onClick={() => setConfirmarId(null)}
                          className="text-xs text-muted-foreground hover:underline"
                        >
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmarId(c.id)}
                        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-red-600 font-medium transition-colors"
                      >
                        <XCircle className="h-3.5 w-3.5" /> Encerrar contrato
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
