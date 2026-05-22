'use client'
import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, Search, X } from 'lucide-react'
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
  cidade: string
  estado: string
  cep?: string
  codigoOrigem?: string
  descricao?: string
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
  quartos: '', banheiros: '', vagas: '', bairro: '', cidade: '',
  estado: '', cep: '', codigoOrigem: '', descricao: '',
}

export default function ImoveisPage() {
  const [imoveis, setImoveis]     = useState<Imovel[]>([])
  const [tipos, setTipos]         = useState<TipoImovel[]>([])
  const [estados, setEstados]     = useState<Estado[]>([])
  const [cidades, setCidades]     = useState<Cidade[]>([])
  const [loading, setLoading]     = useState(true)

  // Filtros
  const [filtroTexto, setFiltroTexto]         = useState('')
  const [filtroTipo, setFiltroTipo]           = useState('__todos__')
  const [filtroFinalidade, setFiltroFinalidade] = useState('__todas__')
  const [filtroStatus, setFiltroStatus]       = useState('__todos__')

  // Modais
  const [formMode, setFormMode]       = useState<'criar' | 'editar' | null>(null)
  const [formData, setFormData]       = useState({ ...BLANK_FORM })
  const [editId, setEditId]           = useState<string | null>(null)
  const [saving, setSaving]           = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Imovel | null>(null)
  const [deleting, setDeleting]       = useState(false)
  const [matchCount, setMatchCount]     = useState(0)
  const [matchHref, setMatchHref]       = useState('/dashboard/matches')

  // Paginação
  const [page, setPage]         = useState(1)
  const [pageSize, setPageSize] = useState(10)

  async function load() {
    try {
      const [imoveisData, tiposData, estadosData] = await Promise.all([
        api.get<Imovel[]>('/imoveis'),
        api.get<TipoImovel[]>('/tipos'),
        api.get<Estado[]>('/localidades/estados'),
      ])
      setImoveis(imoveisData)
      setTipos(tiposData)
      setEstados(estadosData)
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

  useEffect(() => { load() }, [])

  // ── Filtro client-side ──
  const imovelFiltrado = imoveis.filter((i) => {
    const texto = filtroTexto.toLowerCase()
    if (texto && !i.titulo.toLowerCase().includes(texto) &&
        !i.bairro.toLowerCase().includes(texto) &&
        !i.cidade.toLowerCase().includes(texto)) return false
    if (filtroTipo !== '__todos__' && i.tipoId !== filtroTipo) return false
    if (filtroFinalidade !== '__todas__' && i.finalidade !== filtroFinalidade) return false
    if (filtroStatus !== '__todos__' && i.status !== filtroStatus) return false
    return true
  })

  function limparFiltros() {
    setFiltroTexto('')
    setFiltroTipo('__todos__')
    setFiltroFinalidade('__todas__')
    setFiltroStatus('__todos__')
    setPage(1)
  }

  // Reset página quando filtros mudam
  const handleFiltroTexto = (v: string) => { setFiltroTexto(v); setPage(1) }
  const handleFiltroTipo = (v: string) => { setFiltroTipo(v); setPage(1) }
  const handleFiltroFinalidade = (v: string) => { setFiltroFinalidade(v); setPage(1) }
  const handleFiltroStatus = (v: string) => { setFiltroStatus(v); setPage(1) }

  // Itens da página atual
  const imovelPaginado = imovelFiltrado.slice((page - 1) * pageSize, page * pageSize)

  const filtrosAtivos =
    filtroTexto || filtroTipo !== '__todos__' || filtroFinalidade !== '__todas__' || filtroStatus !== '__todos__'

  // ── Criar / Editar ──
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
      bairro:        imovel.bairro,
      cidade:        imovel.cidade,
      estado:        imovel.estado,
      cep:           imovel.cep ?? '',
      codigoOrigem:  imovel.codigoOrigem ?? '',
      descricao:     imovel.descricao ?? '',
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
    if (!formData.titulo || !formData.tipoId || !formData.finalidade || !formData.preco || !formData.areaM2 || !formData.bairro || !formData.cidade || !formData.estado) {
      toast.error('Preencha os campos obrigatórios')
      return
    }
    setSaving(true)
    const payload = {
      titulo:     formData.titulo,
      tipoId:     formData.tipoId,
      finalidade: formData.finalidade,
      preco:      Number(formData.preco),
      areaM2:     Number(formData.areaM2),
      quartos:    formData.quartos   ? Number(formData.quartos)   : undefined,
      banheiros:  formData.banheiros ? Number(formData.banheiros) : undefined,
      vagas:      formData.vagas     ? Number(formData.vagas)     : undefined,
      bairro:        formData.bairro,
      cidade:        formData.cidade,
      estado:        formData.estado,
      cep:           formData.cep || undefined,
      codigoOrigem:  formData.codigoOrigem || undefined,
      descricao:     formData.descricao || undefined,
    }
    try {
      if (formMode === 'criar') {
        // Captura contagem de matches antes de criar
        const matchesAntes = await api.get<any[]>('/matches')
        const qtdAntes = matchesAntes.length

        const criado = await api.post<{ id: string; titulo: string }>('/imoveis', payload)
        setFormMode(null)
        load()
        toast.success('Imóvel cadastrado! Verificando matches...')

        await new Promise((r) => setTimeout(r, 1800))

        const matchesDepois = await api.get<any[]>('/matches')
        const novos = matchesDepois.length - qtdAntes
        if (novos > 0) {
          const params = new URLSearchParams({ imovelId: criado.id, label: payload.titulo })
          setMatchHref(`/dashboard/matches?${params.toString()}`)
          celebrateMatch()
          setMatchCount(novos)
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

  // ── Alterar status inline ──
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

  // ── Excluir ──
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
      {/* ── Overlay de Match ── */}
      {matchCount > 0 && (
        <MatchOverlay count={matchCount} href={matchHref} onClose={() => setMatchCount(0)} />
      )}

      {/* ── Cabeçalho ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Imóveis</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {loading ? 'Carregando...' : `${imovelFiltrado.length} de ${imoveis.length} imóvel(is)`}
          </p>
        </div>
        <Button onClick={abrirCriar} className="gap-2 shadow-sm">
          <Plus className="h-4 w-4" /> Novo imóvel
        </Button>
      </div>

      {/* ── Filtros ── */}
      <Card className="shadow-sm rounded-xl">
        <CardContent className="pt-4 pb-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
            <div className="lg:col-span-2 space-y-1">
              <Label className="text-xs">Buscar</Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-8"
                  placeholder="Título, bairro ou cidade..."
                  value={filtroTexto}
                  onChange={(e) => handleFiltroTexto(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Tipo</Label>
              <Select value={filtroTipo} onValueChange={handleFiltroTipo}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__todos__">Todos os tipos</SelectItem>
                  {tipos.map((t) => <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Finalidade</Label>
              <Select value={filtroFinalidade} onValueChange={handleFiltroFinalidade}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__todas__">Todas</SelectItem>
                  <SelectItem value="VENDA">Venda</SelectItem>
                  <SelectItem value="ALUGUEL">Aluguel</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Status</Label>
              <Select value={filtroStatus} onValueChange={handleFiltroStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__todos__">Todos</SelectItem>
                  {Object.entries(STATUS_LABELS).map(([v, l]) => (
                    <SelectItem key={v} value={v}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {filtrosAtivos && (
            <button
              onClick={limparFiltros}
              className="mt-2 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <X className="h-3 w-3" /> Limpar filtros
            </button>
          )}
        </CardContent>
      </Card>

      {/* ── Tabela ── */}
      <Card className="shadow-sm rounded-xl overflow-hidden">
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
                      {imovel.bairro}, {imovel.cidade}
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
      </Card>

      {/* ── Modal Criar / Editar ── */}
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
                      <SelectItem key={c.id} value={c.nome}>{c.nome}</SelectItem>
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
          </div>
          <DialogFooter className="mt-2">
            <Button variant="outline" onClick={() => setFormMode(null)}>Cancelar</Button>
            <Button onClick={handleSalvar} disabled={saving}>
              {saving ? 'Salvando...' : formMode === 'criar' ? 'Cadastrar' : 'Salvar alterações'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Modal Confirmar Exclusão ── */}
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
