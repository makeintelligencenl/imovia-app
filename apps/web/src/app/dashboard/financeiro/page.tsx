'use client'
import { useEffect, useState, useCallback } from 'react'
import { toast } from 'sonner'
import { CheckCircle } from 'lucide-react'
import { api } from '@/lib/api'
import { getCurrentUser } from '@/lib/auth'
import { useRouter } from 'next/navigation'

interface Resumo {
  totalImobiliaria: number
  totalCorretor:    number
  totalGeral:       number
  pendente:         number
  pago:             number
  vendas:           number
}

interface Corretor { id: string; name: string }

interface Comissao {
  id:           string
  tipo:         'IMOBILIARIA' | 'CORRETOR'
  status:       'PENDENTE' | 'PAGO'
  valorImovel:  number
  percentual:   number
  valor:        number
  dataPagamento: string | null
  createdAt:    string
  imovel:  { id: string; titulo: string; cidade: { nome: string } }
  corretor: { id: string; name: string } | null
  match:   { id: string; perfil: { cliente: { nome: string } } }
}

const PERIODOS = [
  { value: 'mes_atual',    label: 'Este mês'       },
  { value: 'mes_anterior', label: 'Mês anterior'   },
  { value: '15dias',       label: 'Últimos 15 dias' },
  { value: '7dias',        label: 'Últimos 7 dias'  },
]

function fmt(n: number) {
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default function FinanceiroPage() {
  const router = useRouter()
  const [allowed,    setAllowed]    = useState(false)
  const [periodo,    setPeriodo]    = useState('mes_atual')
  const [filtroTipo, setFiltroTipo] = useState('')
  const [filtroStatus, setFiltroStatus] = useState('')
  const [filtroCorretor, setFiltroCorretor] = useState('')
  const [resumo,     setResumo]     = useState<Resumo | null>(null)
  const [comissoes,  setComissoes]  = useState<Comissao[]>([])
  const [corretores, setCorretores] = useState<Corretor[]>([])
  const [loading,    setLoading]    = useState(true)
  const [pagando,    setPagando]    = useState<string | null>(null)

  useEffect(() => {
    getCurrentUser().then((u) => {
      if (!u || u.role !== 'ADMIN') { router.replace('/dashboard'); return }
      setAllowed(true)
    })
    api.get<(Corretor & { role: string })[]>('/users').then((users) =>
      setCorretores(users.filter((u) => u.role === 'CORRETOR'))
    ).catch(() => {})
  }, [router])

  const fetchData = useCallback(() => {
    if (!allowed) return
    setLoading(true)
    const qs = new URLSearchParams({ periodo })
    if (filtroTipo)     qs.set('tipo',       filtroTipo)
    if (filtroStatus)   qs.set('status',     filtroStatus)
    if (filtroCorretor) qs.set('corretorId', filtroCorretor)

    Promise.all([
      api.get<Resumo>(`/financeiro/resumo?periodo=${periodo}`),
      api.get<Comissao[]>(`/financeiro/comissoes?${qs.toString()}`),
    ]).then(([r, c]) => {
      setResumo(r)
      setComissoes(c)
    }).catch(() => toast.error('Erro ao carregar dados financeiros.'))
      .finally(() => setLoading(false))
  }, [allowed, periodo, filtroTipo, filtroStatus, filtroCorretor])

  useEffect(() => { fetchData() }, [fetchData])

  async function marcarPago(id: string) {
    setPagando(id)
    try {
      await api.patch(`/financeiro/comissoes/${id}/pagar`, {})
      toast.success('Comissão marcada como paga.')
      fetchData()
    } catch {
      toast.error('Erro ao marcar como paga.')
    } finally {
      setPagando(null)
    }
  }

  if (!allowed) return null

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Financeiro</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Comissões de vendas fechadas</p>
        </div>
        <select
          value={periodo}
          onChange={(e) => setPeriodo(e.target.value)}
          className="text-sm border border-input rounded-lg px-3 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {PERIODOS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
        </select>
      </div>

      {/* Cards de resumo */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {[
          { label: 'Imobiliária',  value: resumo?.totalImobiliaria, sub: `${resumo?.vendas ?? 0} venda(s)`,  color: '' },
          { label: 'Corretores',   value: resumo?.totalCorretor,    sub: `${resumo?.vendas ?? 0} venda(s)`,  color: '' },
          { label: 'Total geral',  value: resumo?.totalGeral,       sub: '',                                  color: '' },
          { label: 'Pendente',     value: resumo?.pendente,         sub: '',  color: 'text-amber-700 dark:text-amber-400' },
          { label: 'Pago',         value: resumo?.pago,             sub: '',  color: 'text-green-700 dark:text-green-400' },
        ].map((c) => (
          <div key={c.label} className="bg-secondary/60 rounded-lg p-4">
            <p className="text-xs text-muted-foreground mb-1">{c.label}</p>
            <p className={`text-lg font-semibold ${c.color || 'text-foreground'}`}>
              {c.value == null ? '—' : `R$ ${fmt(c.value)}`}
            </p>
            {c.sub && <p className="text-xs text-muted-foreground mt-1">{c.sub}</p>}
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="flex gap-2 flex-wrap">
        <select
          value={filtroTipo}
          onChange={(e) => setFiltroTipo(e.target.value)}
          className="text-sm border border-input rounded-lg px-3 py-1.5 bg-background focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Todos os tipos</option>
          <option value="IMOBILIARIA">Imobiliária</option>
          <option value="CORRETOR">Corretor</option>
        </select>
        <select
          value={filtroStatus}
          onChange={(e) => setFiltroStatus(e.target.value)}
          className="text-sm border border-input rounded-lg px-3 py-1.5 bg-background focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Todos os status</option>
          <option value="PENDENTE">Pendente</option>
          <option value="PAGO">Pago</option>
        </select>
        <select
          value={filtroCorretor}
          onChange={(e) => setFiltroCorretor(e.target.value)}
          className="text-sm border border-input rounded-lg px-3 py-1.5 bg-background focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Todos os corretores</option>
          {corretores.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {/* Tabela */}
      <div className="rounded-xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-secondary/40">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Imóvel</th>
              <th className="text-left px-3 py-3 font-medium text-muted-foreground">Tipo</th>
              <th className="text-left px-3 py-3 font-medium text-muted-foreground">Corretor</th>
              <th className="text-right px-3 py-3 font-medium text-muted-foreground">Valor imóvel</th>
              <th className="text-right px-3 py-3 font-medium text-muted-foreground">Comissão</th>
              <th className="text-center px-3 py-3 font-medium text-muted-foreground">Status</th>
              <th className="text-center px-4 py-3 font-medium text-muted-foreground">Ação</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={7} className="text-center py-10 text-muted-foreground text-sm">Carregando…</td>
              </tr>
            )}
            {!loading && comissoes.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center py-10 text-muted-foreground text-sm">Nenhuma comissão encontrada.</td>
              </tr>
            )}
            {!loading && comissoes.map((c, i) => (
              <tr key={c.id} className={i % 2 === 0 ? '' : 'bg-secondary/20'}>
                <td className="px-4 py-3">
                  <p className="font-medium leading-snug line-clamp-1">{c.imovel.titulo}</p>
                  <p className="text-xs text-muted-foreground">{c.imovel.cidade.nome}</p>
                </td>
                <td className="px-3 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-md font-medium ${
                    c.tipo === 'IMOBILIARIA'
                      ? 'bg-blue-50 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300'
                      : 'bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
                  }`}>
                    {c.tipo === 'IMOBILIARIA' ? 'Imobiliária' : 'Corretor'}
                  </span>
                </td>
                <td className="px-3 py-3 text-muted-foreground">
                  {c.corretor?.name ?? '—'}
                </td>
                <td className="px-3 py-3 text-right">
                  R$ {fmt(Number(c.valorImovel))}
                </td>
                <td className="px-3 py-3 text-right font-medium">
                  <span>R$ {fmt(Number(c.valor))}</span>
                  <span className="block text-xs text-muted-foreground font-normal">{Number(c.percentual)}%</span>
                </td>
                <td className="px-3 py-3 text-center">
                  <span className={`text-xs px-2 py-0.5 rounded-md font-medium ${
                    c.status === 'PENDENTE'
                      ? 'bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
                      : 'bg-green-50 text-green-800 dark:bg-green-950/40 dark:text-green-300'
                  }`}>
                    {c.status === 'PENDENTE' ? 'Pendente' : 'Pago'}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  {c.status === 'PENDENTE' ? (
                    <button
                      onClick={() => marcarPago(c.id)}
                      disabled={pagando === c.id}
                      className="flex items-center gap-1 mx-auto text-xs px-3 py-1 rounded-md bg-green-50 text-green-800 border border-green-200 hover:bg-green-100 dark:bg-green-950/40 dark:text-green-300 dark:border-green-800 disabled:opacity-50 transition-colors"
                    >
                      <CheckCircle className="h-3 w-3" />
                      {pagando === c.id ? '…' : 'Pagar'}
                    </button>
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      {c.dataPagamento ? new Date(c.dataPagamento).toLocaleDateString('pt-BR') : '—'}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-muted-foreground">
        Cada venda gera 2 registros — um para a imobiliária e um para o corretor.
      </p>
    </div>
  )
}
