'use client'
import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Plus, Pencil, Trash2, Search, X, AlertCircle, List, Map } from 'lucide-react'
import dynamic from 'next/dynamic'

const MapaImoveis = dynamic(() => import('@/components/imoveis/MapaImoveis'), { ssr: false })
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectTriggerBadge, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Card, CardContent } from '@/components/ui/card'
import { TablePagination } from '@/components/ui/table-pagination'
import { api } from '@/lib/api'
import { formatCurrency, formatArea } from '@/lib/utils'
import { celebrateMatch } from '@/lib/match-celebration'
import { MatchOverlay } from '@/components/ui/match-overlay'

interface TipoImovel  { id: string; nome: string }
interface Estado     { id: number; sigla: string; nome: string }
interface Cidade     { id: number; nome: string; estadoId: number }

interface Imovel {
  id: string
  titulo: string
  tipo: TipoImovel
  tipoId: string
  finalidade: string
  preco: number
  areaM2: number
  quartos?: number
  banheiros?: number
  vagas?: number
  bairro: string
  cidadeId: number
  cidade: { id: number; nome: string; estado: { id: number; sigla: string; nome: string } }
  estado: string
  cep?: string
  codigoOrigem?: string
  descricao?: string
  urlImovel?: string
  status: string
  createdAt: string
}

const STATUS_COLORS: Record<string, string> = {
  DISPONIVEL: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  RESERVADO:  'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
  ALUGADO:    'bg-blue-50 text-blue-700 ring-1 ring-blue-200',
  VENDIDO:    'bg-slate-100 text-slate-600 ring-1 ring-slate-200',
  INATIVO:    'bg-red-50 text-red-700 ring-1 ring-red-200',
}

const STATUS_LABELS: Record<string, string> = {
  DISPONIVEL: 'Disponível',
  RESERVADO:  'Reservado',
  ALUGADO:    'Alugado',
  VENDIDO:    'Vendido',
  INATIVO:    'Inativo',
}

const BLANK_FORM = {
  titulo: '', tipoId: '', finalidade: '', preco: '', areaM2: '',
  quartos: '', banheiros: '', vagas: '', logradouro: '', numero: '',
  complemento: '', bairro: '', cidade: '', estado: '', cep: '',
  codigoOrigem: '', descricao: '', urlImovel: '',
}

function ImoveisContent() {
  const searchParams  = useSearchParams()
  const router        = useRouter()
  const semMatchParam = searchParams.get('semMatch') === '1'

  const [imoveis, setImoveis]     = useState<Imovel[]>([])
  const [tipos, setTipos]         = useState<TipoImovel[]>([])
  const [estados, setEstados]     = useState<Estado[]>([])
  const [cidades, setCidades]     = useState<Cidade[]>([])
  const [loading, setLoading]     = useState(true)
  const [idsComMatch, setIdsComMatch] = useState<Set<string>>(new Set())

  // Filtros
  const [filtroTexto, setFiltroTexto]         = useState('')
  const [filtroTipo, setFiltroTipo]           = useState('__todos__')
  const [filtroFinalidade, setFiltroFinalidade] = useState('__todas__')
  const [filtroStatus, setFiltroStatus]       = useState('__todos__')
  const [filtroEstado, setFiltroEstado]       = useState('__todos__')
  const [filtroCidadeId, setFiltroCidadeId]   = useState('__todas__')
  const [cidadesFiltro, setCidadesFiltro]     = useState<Cidade[]>([])

  // Painel de filtros (variante B)
  const [painelAberto, setPainelAberto] = useState(false)
  const [staged, setStaged] = useState({
    tipo: '__todos__', finalidade: '__todas__', status: '__todos__',
    estado: '__todos__', cidadeId: '__todas__',
  })
  const [cidadesStaged, setCidadesStaged] = useState<Cidade[]>([])

  // Modais
  const [formMode, setFormMode]       = useState<'criar' | 'editar' | null>(null)
  const [formData, setFormData]       = useState({ ...BLANK_FORM })
  const [editId, setEditId]           = useState<string | null>(null)
  const [saving, setSaving]           = useState(false)
  const [vistaAtual, setVistaAtual]   = useState<'lista' | 'mapa'>('lista')
  const [deleteTarget, setDeleteTarget] = useState<Imovel | null>(null)
  const [deleting, setDeleting]       = useState(false)
  const [matchCount, setMatchCount]     = useState(0)
  const [matchHref, setMatchHref]       = useState('/dashboard/matches')

  // Paginação
  const [page, setPage]         = useState(1)
  const [pageSize, setPageSize] = useState(10)

  async function load() {
    try {
      const requests: Promise<any>[] = [
        api.get<Imovel[]>('/imoveis'),
        api.get<TipoImovel[]>('/tipos'),
        api.get<Estado[]>('/localidades/estados'),
      ]
      if (semMatchParam) {
        requests.push(api.get<{ imovel: { id: string } }[]>('/matches'))
      }
      const [imoveisData, tiposData, estadosData, matchesData] = await Promise.all(requests)
      setImoveis(imoveisData)
      setTipos(tiposData)
      setEstados(estadosData)
      if (matchesData) {
        setIdsComMatch(new Set((matchesData as { imovel: { id: string } }[]).map((m) => m.imovel.id)))
      }
    } finally {
      setLoading(false)
    }
  }

  // Carrega cidades quando o estado muda no formulário
  async function carregarCidades(estadoId: number) {
    if (!estadoId) { setCidades([]); return }
    const data = await api.get<Cidade[]>(`/localidades/cidades?estadoId=${estadoId}`)
    setCidades(data)
  }

  // Carrega cidades para o filtro quando o estado do filtro muda
  async function carregarCidadesFiltro(estadoId: number) {
    if (!estadoId) { setCidadesFiltro([]); return }
    const data = await api.get<Cidade[]>(`/localidades/cidades?estadoId=${estadoId}`)
    setCidadesFiltro(data)
  }

  useEffect(() => { load() }, [semMatchParam]) // re-load se o filtro mudar

  // -- Filtro client-side --
  const imovelFiltrado = imoveis.filter((i) => {
    // Filtro especial: apenas disponíveis sem match (vindo do dashboard)
    if (semMatchParam && (i.status !== 'DISPONIVEL' || idsComMatch.has(i.id))) return false
    const texto = filtroTexto.toLowerCase()
    if (texto && !i.titulo.toLowerCase().includes(texto) &&
        !i.bairro.toLowerCase().includes(texto) &&
        !i.cidade.nome.toLowerCase().includes(texto)) return false
    if (filtroTipo !== '__todos__' && i.tipoId !== filtroTipo) return false
    if (filtroFinalidade !== '__todas__' && i.finalidade !== filtroFinalidade) return false
    if (filtroStatus !== '__todos__' && i.status !== filtroStatus) return false
    if (filtroEstado !== '__todos__' && i.cidade.estado.sigla !== filtroEstado) return false
    if (filtroCidadeId !== '__todas__' && String(i.cidadeId) !== filtroCidadeId) return false
    return true
  })

  function limparFiltros() {
    setFiltroTexto('')
    setFiltroTipo('__todos__')
    setFiltroFinalidade('__todas__')
    setFiltroStatus('__todos__')
    setFiltroEstado('__todos__')
    setFiltroCidadeId('__todas__')
    setCidadesFiltro([])
    setPage(1)
  }

  // Reset página quando filtros mudam
  const handleFiltroTexto = (v: string) => { setFiltroTexto(v); setPage(1) }
  const handleFiltroTipo = (v: string) => { setFiltroTipo(v); setPage(1) }
  const handleFiltroFinalidade = (v: string) => { setFiltroFinalidade(v); setPage(1) }
  const handleFiltroStatus = (v: string) => { setFiltroStatus(v); setPage(1) }
  const handleFiltroEstado = (sigla: string) => {
    setFiltroEstado(sigla)
    setFiltroCidadeId('__todas__')
    setPage(1)
    if (sigla !== '__todos__') {
      const est = estados.find((e) => e.sigla === sigla)
      if (est) carregarCidadesFiltro(est.id)
    } else {
      setCidadesFiltro([])
    }
  }
  const handleFiltroCidade = (v: string) => { setFiltroCidadeId(v); setPage(1) }

  // Painel B — abrir (snapshot dos filtros atuais para staged)
  function abrirPainel() {
    setStaged({
      tipo: filtroTipo, finalidade: filtroFinalidade, status: filtroStatus,
      estado: filtroEstado, cidadeId: filtroCidadeId,
    })
    setCidadesStaged(cidadesFiltro)
    setPainelAberto(true)
  }

  // Painel B — aplicar staged nos filtros reais
  function aplicarFiltros() {
    handleFiltroTipo(staged.tipo)
    handleFiltroFinalidade(staged.finalidade)
    handleFiltroStatus(staged.status)
    if (staged.estado !== filtroEstado) handleFiltroEstado(staged.estado)
    handleFiltroCidade(staged.cidadeId)
    setPainelAberto(false)
  }

  async function stagedEstadoChange(sigla: string) {
    setStaged((s) => ({ ...s, estado: sigla, cidadeId: '__todas__' }))
    if (!sigla || sigla === '__todos__') { setCidadesStaged([]); return }
    const est = estados.find((e) => e.sigla === sigla)
    if (est) {
      const data = await api.get<Cidade[]>(`/localidades/cidades?estadoId=${est.id}`)
      setCidadesStaged(data)
    }
  }

  // Itens da página atual
  const imovelPaginado = imovelFiltrado.slice((page - 1) * pageSize, page * pageSize)

  const filtrosAtivos =
    filtroTexto || filtroTipo !== '__todos__' || filtroFinalidade !== '__todas__' || filtroStatus !== '__todos__' ||
    filtroEstado !== '__todos__' || filtroCidadeId !== '__todas__'

  // Criar / Editar
  function abrirCriar() {
    setFormData({ ...BLANK_FORM })
    setEditId(null)
    setFormMode('criar')
  }

  function abrirEditar(imovel: Imovel) {
    // Carregar cidades do estado atual ao editar
    const estadoObj = estados.find((e) => e.sigla === imovel.estado)
    if (estadoObj) carregarCidades(estadoObj.id)

    setFormData({
      titulo:        imovel.titulo,
      tipoId:        imovel.tipoId,
      finalidade:    imovel.finalidade,
      preco:         String(imovel.preco),
      areaM2:        String(imovel.areaM2),
      quartos:       imovel.quartos != null ? String(imovel.quartos) : '',
      banheiros:     imovel.banheiros != null ? String(imovel.banheiros) : '',
      vagas:         imovel.vagas != null ? String(imovel.vagas) : '',
      logradouro:    (imovel as any).logradouro ?? '',
      numero:        (imovel as any).numero ?? '',
      complemento:   (imovel as any).complemento ?? '',
      bairro:        imovel.bairro,
      cidade:        String(imovel.cidadeId),
      estado:        imovel.estado,
      cep:           imovel.cep ?? '',
      codigoOrigem:  imovel.codigoOrigem ?? '',
      descricao:     imovel.descricao ?? '',
      urlImovel:     imovel.urlImovel ?? '',
    })
    setEditId(imovel.id)
    setFormMode('editar')
  }

  function field(name: keyof typeof BLANK_FORM) {
    return {
      value: formData[name],
      onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
        setFormData((prev) => ({ ...prev, [name]: e.target.value })),
    }
  }

  async function handleSalvar() {
    if (!formData.titulo || !formData.tipoId || !formData.finalidade || !formData.preco || !formData.areaM2 || !formData.logradouro || !formData.numero || !formData.bairro || !formData.cidade || !formData.estado || !Number(formData.cidade)) {
      toast.error('Preencha os campos obrigatórios')
      return
    }
    setSaving(true)
    const payload = {
      titulo:      formData.titulo,
      tipoId:      formData.tipoId,
      finalidade:  formData.finalidade,
      preco:       Number(formData.preco),
      areaM2:      Number(formData.areaM2),
      quartos:     formData.quartos   ? Number(formData.quartos)   : undefined,
      banheiros:   formData.banheiros ? Number(formData.banheiros) : undefined,
      vagas:       formData.vagas     ? Number(formData.vagas)     : undefined,
      logradouro:  formData.logradouro,
      numero:      formData.numero,
      complemento: formData.complemento || undefined,
      bairro:      formData.bairro,
      cidadeId:    Number(formData.cidade),
      estado:      formData.estado,
      cep:         formData.cep || undefined,
      codigoOrigem: formData.codigoOrigem || undefined,
      descricao:   formData.descricao || undefined,
      urlImovel:   formData.urlImovel || undefined,
    }
    try {
      if (formMode === 'criar') {
        const criado = await api.post<{ id: string; titulo: string; matchesEncontrados: number }>('/imoveis', payload)
        setFormMode(null)
        load()

        if (criado.matchesEncontrados > 0) {
          const params = new URLSearchParams({ imovelId: criado.id, label: payload.titulo })
          setMatchHref(`/dashboard/matches?${params.toString()}`)
          celebrateMatch()
          setMatchCount(criado.matchesEncontrados)
        } else {
          toast.success('Imóvel cadastrado com sucesso!')
        }
      } else {
        await api.patch(`/imoveis/${editId}`, payload)
        toast.success('Imóvel atualizado.')
        setFormMode(null)
        load()
      }
    } catch {
      toast.error('Erro ao salvar imóvel')
    } finally {
      setSaving(false)
    }
  }

  // Alterar status inline
  async function handleStatusChange(id: string, status: string) {
    // Atualiza otimisticamente na UI
    setImoveis((prev) => prev.map((i) => i.id === id ? { ...i, status } : i))
    try {
      await api.patch(`/imoveis/${id}/status`, { status })
      toast.success(`Status atualizado para ${STATUS_LABELS[status]}`)
    } catch {
      toast.error('Erro ao atualizar status')
      load() // reverte em caso de erro
    }
  }

  // Excluir
  async function handleExcluir() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await api.delete(`/imoveis/${deleteTarget.id}`)
      toast.success('Imóvel excluído.')
      setDeleteTarget(null)
      load()
    } catch {
      toast.error('Erro ao excluir imóvel')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Overlay de Match */}
      {matchCount > 0 && (
        <MatchOverlay count={matchCount} href={matchHref} onClose={() => setMatchCount(0)} />
      )}

      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Imóveis</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {loading ? 'Carregando...' : `${imovelFiltrado.length} de ${imoveis.length} imóvel(is)`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border overflow-hidden">
            <Button
              variant={vistaAtual === 'lista' ? 'default' : 'ghost'}
              size="sm"
              className="rounded-none gap-1.5"
              onClick={() => setVistaAtual('lista')}
            >
              <List className="h-4 w-4" /> Lista
            </Button>
            <Button
              variant={vistaAtual === 'mapa' ? 'default' : 'ghost'}
              size="sm"
              className="rounded-none gap-1.5"
              onClick={() => setVistaAtual('mapa')}
            >
              <Map className="h-4 w-4" /> Mapa
            </Button>
          </div>
          <Button onClick={abrirCriar} className="gap-2 shadow-sm">
            <Plus className="h-4 w-4" /> Novo imóvel
          </Button>
        </div>
      </div>

      {/* Banner: filtro vindo do Dashboard */}
      {semMatchParam && (
        <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm">
          <AlertCircle className="h-4 w-4 shrink-0 text-amber-500" />
          <span className="flex-1">
            Mostrando apenas <strong>imóveis disponíveis sem match</strong> — estes precisam de atenção.
          </span>
          <button
            onClick={() => router.replace('/dashboard/imoveis')}
            className="flex items-center gap-1 text-xs font-medium text-amber-700 hover:text-amber-900 shrink-0"
          >
            <X className="h-3.5 w-3.5" /> Limpar filtro
          </button>
        </div>
      )}

      {/* Filtros — Variante B */}
      {(() => {
        const ativos = [
          filtroTipo !== '__todos__' ? tipos.find(t => t.id === filtroTipo)?.nome : null,
          filtroFinalidade !== '__todas__' ? (filtroFinalidade === 'VENDA' ? 'Venda' : 'Aluguel') : null,
          filtroStatus !== '__todos__' ? STATUS_LABELS[filtroStatus] : null,
          filtroEstado !== '__todos__' ? filtroEstado : null,
          filtroCidadeId !== '__todas__' ? cidadesFiltro.find(c => String(c.id) === filtroCidadeId)?.nome : null,
        ].filter(Boolean) as string[]

        return (
          <div className="space-y-2">
            {/* Linha topo */}
            <div className="flex items-center gap-3 flex-wrap">
              <div className="relative flex-1 min-w-[200px] max-w-sm">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Buscar por título, bairro ou cidade..."
                  value={filtroTexto}
                  onChange={(e) => handleFiltroTexto(e.target.value)}
                />
              </div>

              <Button
                variant={painelAberto ? 'default' : ativos.length > 0 ? 'default' : 'outline'}
                className="gap-2 shrink-0"
                onClick={painelAberto ? () => setPainelAberto(false) : abrirPainel}
              >
                <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none">
                  <path d="M1 4h14M4 8h8M6 12h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
                Filtrar
                {ativos.length > 0 && (
                  <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-white/25 text-xs font-bold">
                    {ativos.length}
                  </span>
                )}
                <svg className={`h-4 w-4 transition-transform ${painelAberto ? 'rotate-180' : ''}`} viewBox="0 0 16 16" fill="none">
                  <path d="M3 6l5 5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </Button>

              {/* Tags dos filtros ativos (quando painel fechado) */}
              {!painelAberto && ativos.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  {ativos.map((label) => (
                    <span key={label} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium border border-primary/20">
                      {label}
                    </span>
                  ))}
                  <button onClick={limparFiltros} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-0.5 ml-1">
                    <X className="h-3 w-3" /> Limpar
                  </button>
                </div>
              )}
            </div>

            {/* Painel expansível */}
            {painelAberto && (
              <Card className="shadow-sm rounded-xl overflow-hidden">
                <CardContent className="pt-5 pb-0">
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Tipo</Label>
                      <Select value={staged.tipo} onValueChange={(v) => setStaged((s) => ({ ...s, tipo: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__todos__">Todos os tipos</SelectItem>
                          {tipos.map((t) => <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Finalidade</Label>
                      <div className="flex gap-1.5">
                        {(['__todas__', 'VENDA', 'ALUGUEL'] as const).map((v) => (
                          <button
                            key={v}
                            onClick={() => setStaged((s) => ({ ...s, finalidade: v }))}
                            className={`flex-1 py-2 text-xs rounded-lg border font-semibold transition-all
                              ${staged.finalidade === v
                                ? v === 'VENDA' ? 'bg-violet-600 text-white border-violet-600'
                                  : v === 'ALUGUEL' ? 'bg-orange-500 text-white border-orange-500'
                                  : 'bg-foreground text-background border-foreground'
                                : 'bg-background text-muted-foreground border-border hover:border-foreground/40'}`}
                          >
                            {v === '__todas__' ? 'Todas' : v === 'VENDA' ? 'Venda' : 'Aluguel'}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</Label>
                      <Select value={staged.status} onValueChange={(v) => setStaged((s) => ({ ...s, status: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__todos__">Todos</SelectItem>
                          {Object.entries(STATUS_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Estado</Label>
                      <Select value={staged.estado} onValueChange={stagedEstadoChange}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__todos__">Todos</SelectItem>
                          {estados.map((e) => <SelectItem key={e.id} value={e.sigla}>{e.sigla} — {e.nome}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Cidade</Label>
                      <Select
                        value={staged.cidadeId}
                        onValueChange={(v) => setStaged((s) => ({ ...s, cidadeId: v }))}
                        disabled={staged.estado === '__todos__' || cidadesStaged.length === 0}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={staged.estado !== '__todos__' ? 'Todas' : 'Selecione o estado'} />
                        </SelectTrigger>
                        <SelectContent className="max-h-60">
                          <SelectItem value="__todas__">Todas</SelectItem>
                          {cidadesStaged.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.nome}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
                <div className="flex items-center justify-between px-5 py-3 mt-4 border-t bg-muted/40">
                  <button
                    onClick={() => { setStaged({ tipo: '__todos__', finalidade: '__todas__', status: '__todos__', estado: '__todos__', cidadeId: '__todas__' }); setCidadesStaged([]) }}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Limpar filtros
                  </button>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setPainelAberto(false)}>Cancelar</Button>
                    <Button size="sm" onClick={aplicarFiltros} className="px-6">Aplicar filtros</Button>
                  </div>
                </div>
              </Card>
            )}
          </div>
        )
      })()}

      {/* Mapa */}
      {vistaAtual === 'mapa' && (
        <Card className="shadow-sm rounded-xl overflow-hidden">
          <CardContent className="p-3">
            <MapaImoveis imoveis={imovelFiltrado as any} />
          </CardContent>
        </Card>
      )}

      {/* Tabela */}
      {vistaAtual === 'lista' && <Card className="shadow-sm rounded-xl overflow-hidden">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Título</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Finalidade</TableHead>
                <TableHead className="text-right">Preço</TableHead>
                <TableHead className="text-right">Área</TableHead>
                <TableHead className="text-center">Quartos</TableHead>
                <TableHead>Localização</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-20 text-center">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-10 text-muted-foreground">Carregando...</TableCell>
                </TableRow>
              ) : imovelFiltrado.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-10 text-muted-foreground">
                    {filtrosAtivos ? 'Nenhum imóvel com esses filtros.' : 'Nenhum imóvel cadastrado.'}
                  </TableCell>
                </TableRow>
              ) : (
                imovelPaginado.map((imovel) => (
                  <TableRow key={imovel.id}>
                    <TableCell className="font-medium max-w-[200px] truncate" title={imovel.titulo}>
                      {imovel.titulo}
                    </TableCell>
                    <TableCell>{imovel.tipo?.nome ?? '—'}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-full ${imovel.finalidade === 'VENDA' ? 'bg-violet-50 text-violet-700 ring-1 ring-violet-200' : 'bg-orange-50 text-orange-700 ring-1 ring-orange-200'}`}>
                        {imovel.finalidade === 'VENDA' ? 'Venda' : 'Aluguel'}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(imovel.preco)}</TableCell>
                    <TableCell className="text-right">{formatArea(imovel.areaM2)}</TableCell>
                    <TableCell className="text-center">{imovel.quartos ?? '—'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {imovel.bairro}, {imovel.cidade.nome}
                    </TableCell>
                    <TableCell>
                      <Select
                        value={imovel.status}
                        onValueChange={(v) => handleStatusChange(imovel.id, v)}
                      >
                        <SelectTriggerBadge title="Clique para alterar o status">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold cursor-pointer transition-opacity hover:opacity-75 ${STATUS_COLORS[imovel.status] ?? ''}`}>
                            {STATUS_LABELS[imovel.status] ?? imovel.status}
                            <svg className="h-2.5 w-2.5 opacity-60" viewBox="0 0 10 10" fill="currentColor">
                              <path d="M5 7L1 3h8L5 7z"/>
                            </svg>
                          </span>
                        </SelectTriggerBadge>
                        <SelectContent>
                          {Object.entries(STATUS_LABELS).map(([v, l]) => (
                            <SelectItem key={v} value={v} className="text-xs">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_COLORS[v]}`}>
                                {l}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          title="Editar"
                          onClick={() => abrirEditar(imovel)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          title="Excluir"
                          onClick={() => setDeleteTarget(imovel)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          <TablePagination
            total={imovelFiltrado.length}
            page={page}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={(s) => { setPageSize(s); setPage(1) }}
          />
        </CardContent>
      </Card>}

      {/* Modal Criar / Editar */}
      <Dialog open={formMode !== null} onOpenChange={(open) => !open && setFormMode(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{formMode === 'criar' ? 'Novo imóvel' : 'Editar imóvel'}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2 space-y-1">
              <Label>Título *</Label>
              <Input placeholder="Ex: Apartamento 3 quartos no Jardins" {...field('titulo')} />
            </div>
            <div className="space-y-1">
              <Label>Tipo *</Label>
              <Select value={formData.tipoId} onValueChange={(v) => setFormData((p) => ({ ...p, tipoId: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {tipos.map((t) => <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Finalidade *</Label>
              <Select value={formData.finalidade} onValueChange={(v) => setFormData((p) => ({ ...p, finalidade: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="VENDA">Venda</SelectItem>
                  <SelectItem value="ALUGUEL">Aluguel</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Preço (R$) *</Label>
              <Input type="number" min="0" placeholder="350000" {...field('preco')} />
            </div>
            <div className="space-y-1">
              <Label>Área (m²) *</Label>
              <Input type="number" min="1" placeholder="85" {...field('areaM2')} />
            </div>
            <div className="space-y-1">
              <Label>Quartos</Label>
              <Input type="number" min="0" placeholder="3" {...field('quartos')} />
            </div>
            <div className="space-y-1">
              <Label>Banheiros</Label>
              <Input type="number" min="0" placeholder="2" {...field('banheiros')} />
            </div>
            <div className="space-y-1">
              <Label>Vagas</Label>
              <Input type="number" min="0" placeholder="1" {...field('vagas')} />
            </div>
            <div className="sm:col-span-2 space-y-1">
              <Label>Logradouro *</Label>
              <Input placeholder="Rua das Flores" {...field('logradouro')} />
            </div>
            <div className="space-y-1">
              <Label>Número *</Label>
              <Input placeholder="123" {...field('numero')} />
            </div>
            <div className="space-y-1">
              <Label>Complemento</Label>
              <Input placeholder="Apto 42" {...field('complemento')} />
            </div>
            <div className="space-y-1">
              <Label>Bairro *</Label>
              <Input placeholder="Cidade Nobre" {...field('bairro')} />
            </div>
            <div className="space-y-1">
              <Label>Estado *</Label>
              <Select
                value={formData.estado}
                onValueChange={(sigla) => {
                  const est = estados.find((e) => e.sigla === sigla)
                  setFormData((p) => ({ ...p, estado: sigla, cidade: '' }))
                  if (est) carregarCidades(est.id)
                  else setCidades([])
                }}
              >
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {estados.map((e) => (
                    <SelectItem key={e.id} value={e.sigla}>{e.sigla} — {e.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Cidade *</Label>
              {cidades.length > 0 ? (
                <Select
                  value={formData.cidade}
                  onValueChange={(v) => setFormData((p) => ({ ...p, cidade: v }))}
                >
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent className="max-h-60">
                    {cidades.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>{c.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  placeholder={formData.estado ? 'Selecione o estado primeiro' : 'Digite a cidade'}
                  disabled={!!formData.estado && cidades.length === 0 && estados.some(e => e.sigla === formData.estado)}
                  {...field('cidade')}
                />
              )}
            </div>
            <div className="space-y-1">
              <Label>CEP</Label>
              <Input
                placeholder="00000-000"
                maxLength={9}
                value={formData.cep}
                onChange={(e) => {
                  const v = e.target.value.replace(/\D/g, '').slice(0, 8)
                  const masked = v.length > 5 ? `${v.slice(0, 5)}-${v.slice(5)}` : v
                  setFormData((p) => ({ ...p, cep: masked }))
                }}
              />
            </div>
            <div className="space-y-1">
              <Label>Código de Origem</Label>
              <Input maxLength={255} placeholder="Ex: IMV-00123" {...field('codigoOrigem')} />
            </div>
            <div className="sm:col-span-2 space-y-1">
              <Label>Descrição</Label>
              <Input placeholder="Detalhes do imóvel..." {...field('descricao')} />
            </div>
            <div className="sm:col-span-2 space-y-1">
              <Label>URL do imóvel no site</Label>
              <Input placeholder="https://suaimobiliaria.com.br/imoveis/123" {...field('urlImovel')} />
            </div>
          </div>
          <DialogFooter className="mt-2">
            <Button variant="outline" onClick={() => setFormMode(null)}>Cancelar</Button>
            <Button onClick={handleSalvar} disabled={saving}>
              {saving ? 'Salvando...' : formMode === 'criar' ? 'Cadastrar' : 'Salvar alterações'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Confirmar Exclusão */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Excluir imóvel</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir <strong>{deleteTarget?.titulo}</strong>?
              Os matches associados também serão removidos. Essa ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleExcluir} disabled={deleting}>
              {deleting ? 'Excluindo...' : 'Excluir'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function ImoveisPage() {
  return (
    <Suspense fallback={<div className="p-8 text-slate-500">Carregando imóveis...</div>}>
      <ImoveisContent />
    </Suspense>
  )
}
