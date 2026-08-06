'use client'
import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, Search, X, MessageCircle, UserRound } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Card, CardContent } from '@/components/ui/card'
import { TablePagination } from '@/components/ui/table-pagination'
import { api } from '@/lib/api'
import { formatCurrency } from '@/lib/utils'
import { celebrateMatch } from '@/lib/match-celebration'
import { MatchOverlay } from '@/components/ui/match-overlay'

interface TipoImovel { id: string; nome: string }

interface ClienteResumido { id: string; nome: string; email: string; whatsapp?: string }

interface Perfil {
  id: string
  clienteId: string
  cliente: ClienteResumido
  finalidade: string
  tipos: TipoImovel[]
  precoMin: number | string
  precoMax: number | string
  areaMin: number | string
  quartosMin?: number | null
  cidades: string[]
  bairros: string[]
  ativo: boolean
  createdAt: string
}

const BLANK_FORM = {
  clienteId: '', finalidade: '', precoMin: '', precoMax: '',
  areaMin: '', quartosMin: '', cidades: '', bairros: '',
}

export default function PerfisPage() {
  const [perfis,    setPerfis]   = useState<Perfil[]>([])
  const [tipos,     setTipos]    = useState<TipoImovel[]>([])
  const [clientes,  setClientes] = useState<ClienteResumido[]>([])
  const [loading,   setLoading]  = useState(true)

  const [filtroTexto,      setFiltroTexto]      = useState('')
  const [filtroFinalidade, setFiltroFinalidade] = useState('__todas__')
  const [filtroTipo,       setFiltroTipo]       = useState('__todos__')

  const [formMode,         setFormMode]   = useState<'criar' | 'editar' | null>(null)
  const [formData,         setFormData]   = useState({ ...BLANK_FORM })
  const [tiposSelecionados, setTiposSel]  = useState<string[]>([])
  const [editId,           setEditId]    = useState<string | null>(null)
  const [saving,           setSaving]    = useState(false)

  const [deleteTarget, setDeleteTarget] = useState<Perfil | null>(null)
  const [deleting,     setDeleting]     = useState(false)
  const [matchCount,   setMatchCount]   = useState(0)
  const [matchHref,    setMatchHref]    = useState('/matches')

  const [page,     setPage]     = useState(1)
  const [pageSize, setPageSize] = useState(10)

  async function load() {
    try {
      const [perfisData, tiposData, clientesData] = await Promise.all([
        api.get<Perfil[]>('/perfis'),
        api.get<TipoImovel[]>('/tipos'),
        api.get<ClienteResumido[]>('/clientes'),
      ])
      setPerfis(perfisData)
      setTipos(tiposData)
      setClientes(clientesData)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const perfisFiltrados = perfis.filter((p) => {
    const texto = filtroTexto.toLowerCase()
    if (texto &&
      !p.cliente.nome.toLowerCase().includes(texto) &&
      !p.cliente.email.toLowerCase().includes(texto) &&
      !p.cidades.some((c) => c.toLowerCase().includes(texto))) return false
    if (filtroFinalidade !== '__todas__' && p.finalidade !== filtroFinalidade) return false
    if (filtroTipo !== '__todos__' && !p.tipos.some((t) => t.id === filtroTipo)) return false
    return true
  })

  const filtrosAtivos = filtroTexto || filtroFinalidade !== '__todas__' || filtroTipo !== '__todos__'

  function limparFiltros() {
    setFiltroTexto(''); setFiltroFinalidade('__todas__'); setFiltroTipo('__todos__'); setPage(1)
  }

  const perfisPaginados = perfisFiltrados.slice((page - 1) * pageSize, page * pageSize)

  function abrirCriar() {
    setFormData({ ...BLANK_FORM })
    setTiposSel([])
    setEditId(null)
    setFormMode('criar')
  }

  function abrirEditar(p: Perfil) {
    setFormData({
      clienteId:  p.clienteId,
      finalidade: p.finalidade,
      precoMin:   String(p.precoMin),
      precoMax:   String(p.precoMax),
      areaMin:    String(p.areaMin),
      quartosMin: p.quartosMin != null ? String(p.quartosMin) : '',
      cidades:    p.cidades.join(', '),
      bairros:    p.bairros.join(', '),
    })
    setTiposSel(p.tipos.map((t) => t.id))
    setEditId(p.id)
    setFormMode('editar')
  }

  function toggleTipo(id: string) {
    setTiposSel((prev) => prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id])
  }

  function field(name: keyof Omit<typeof BLANK_FORM, 'clienteId' | 'finalidade'>) {
    return {
      value: formData[name],
      onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
        setFormData((prev) => ({ ...prev, [name]: e.target.value })),
    }
  }

  async function handleSalvar() {
    if (!formData.clienteId || !formData.finalidade ||
        !formData.precoMin || !formData.precoMax || !formData.cidades) {
      toast.error('Preencha os campos obrigatórios')
      return
    }
    if (tiposSelecionados.length === 0) {
      toast.error('Selecione pelo menos um tipo de imóvel')
      return
    }
    setSaving(true)
    const payload = {
      clienteId:  formData.clienteId,
      finalidade: formData.finalidade,
      tiposIds:   tiposSelecionados,
      precoMin:   Number(formData.precoMin),
      precoMax:   Number(formData.precoMax),
      areaMin:    formData.areaMin ? Number(formData.areaMin) : undefined,
      quartosMin: formData.quartosMin ? Number(formData.quartosMin) : undefined,
      cidades:    formData.cidades.split(',').map((c) => c.trim()).filter(Boolean),
      bairros:    formData.bairros ? formData.bairros.split(',').map((b) => b.trim()).filter(Boolean) : [],
    }
    try {
      if (formMode === 'criar') {
        const matchesAntes = await api.get<any[]>('/matches')
        const qtdAntes = matchesAntes.length

        const criado = await api.post<{ id: string; cliente: { nome: string } }>('/perfis', payload)
        setFormMode(null)
        load()
        toast.success('Perfil cadastrado! Verificando matches...')

        await new Promise((r) => setTimeout(r, 1800))

        const matchesDepois = await api.get<any[]>('/matches')
        const novos = matchesDepois.length - qtdAntes
        if (novos > 0) {
          const params = new URLSearchParams({ perfilId: criado.id, label: criado.cliente.nome })
          setMatchHref(`/matches?${params.toString()}`)
          celebrateMatch()
          setMatchCount(novos)
        }
      } else {
        await api.patch(`/perfis/${editId}`, payload)
        toast.success('Perfil atualizado.')
        setFormMode(null)
        load()
      }
    } catch {
      toast.error('Erro ao salvar perfil')
    } finally {
      setSaving(false)
    }
  }

  async function handleExcluir() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await api.delete(`/perfis/${deleteTarget.id}`)
      toast.success('Perfil excluído.')
      setDeleteTarget(null)
      load()
    } catch {
      toast.error('Erro ao excluir perfil')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-4">
      {matchCount > 0 && (
        <MatchOverlay count={matchCount} href={matchHref} onClose={() => setMatchCount(0)} />
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Perfis de Busca</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {loading ? 'Carregando...' : `${perfisFiltrados.length} de ${perfis.length} perfil(is)`}
          </p>
        </div>
        <Button onClick={abrirCriar} className="gap-2 shadow-sm">
          <Plus className="h-4 w-4" /> Novo perfil
        </Button>
      </div>

      {/* Filtros */}
      <Card className="shadow-sm rounded-xl">
        <CardContent className="pt-4 pb-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
            <div className="lg:col-span-2 space-y-1">
              <Label className="text-xs">Buscar</Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-8"
                  placeholder="Nome, e-mail ou cidade..."
                  value={filtroTexto}
                  onChange={(e) => { setFiltroTexto(e.target.value); setPage(1) }}
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Finalidade</Label>
              <Select value={filtroFinalidade} onValueChange={(v) => { setFiltroFinalidade(v); setPage(1) }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__todas__">Todas</SelectItem>
                  <SelectItem value="VENDA">Compra</SelectItem>
                  <SelectItem value="ALUGUEL">Aluguel</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Tipo de imóvel</Label>
              <Select value={filtroTipo} onValueChange={(v) => { setFiltroTipo(v); setPage(1) }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__todos__">Todos os tipos</SelectItem>
                  {tipos.map((t) => <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          {filtrosAtivos && (
            <button onClick={limparFiltros} className="mt-2 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
              <X className="h-3 w-3" /> Limpar filtros
            </button>
          )}
        </CardContent>
      </Card>

      {/* Tabela */}
      <Card className="shadow-sm rounded-xl overflow-hidden">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Finalidade</TableHead>
                <TableHead>Tipos</TableHead>
                <TableHead>Faixa de preço</TableHead>
                <TableHead className="text-right">Área mín.</TableHead>
                <TableHead className="text-center">Quartos mín.</TableHead>
                <TableHead>Cidades / Bairros</TableHead>
                <TableHead className="w-20 text-center">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-10 text-muted-foreground">Carregando...</TableCell>
                </TableRow>
              ) : perfisFiltrados.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-10 text-muted-foreground">
                    {filtrosAtivos ? 'Nenhum perfil com esses filtros.' : 'Nenhum perfil cadastrado.'}
                  </TableCell>
                </TableRow>
              ) : (
                perfisPaginados.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <UserRound className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        <div>
                          <p className="font-medium text-sm">{p.cliente.nome}</p>
                          <p className="text-xs text-muted-foreground">{p.cliente.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-full ${p.finalidade === 'VENDA' ? 'bg-violet-50 text-violet-700 ring-1 ring-violet-200' : 'bg-orange-50 text-orange-700 ring-1 ring-orange-200'}`}>
                        {p.finalidade === 'VENDA' ? 'Compra' : 'Aluguel'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {p.tipos.map((t) => (
                          <Badge key={t.id} variant="secondary" className="text-xs">{t.nome}</Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm whitespace-nowrap">
                      {formatCurrency(p.precoMin)} – {formatCurrency(p.precoMax)}
                    </TableCell>
                    <TableCell className="text-right">{Number(p.areaMin)} m²</TableCell>
                    <TableCell className="text-center">{p.quartosMin ?? '—'}</TableCell>
                    <TableCell className="text-sm">
                      <p>{p.cidades.join(', ')}</p>
                      {p.bairros?.length > 0 && (
                        <p className="text-xs text-muted-foreground">{p.bairros.join(', ')}</p>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center gap-1">
                        <Button size="icon" variant="ghost" className="h-7 w-7" title="Editar" onClick={() => abrirEditar(p)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" title="Excluir" onClick={() => setDeleteTarget(p)}>
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
            total={perfisFiltrados.length}
            page={page}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={(s) => { setPageSize(s); setPage(1) }}
          />
        </CardContent>
      </Card>

      {/* Modal Criar / Editar */}
      <Dialog open={formMode !== null} onOpenChange={(open) => !open && setFormMode(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{formMode === 'criar' ? 'Novo perfil de busca' : 'Editar perfil'}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

            {/* Cliente */}
            <div className="sm:col-span-2 space-y-1">
              <Label>Cliente *</Label>
              {clientes.length === 0 ? (
                <p className="text-xs text-muted-foreground py-2">
                  Nenhum cliente cadastrado.{' '}
                  <a href="/clientes" className="text-blue-600 underline">Cadastrar agora →</a>
                </p>
              ) : (
                <Select
                  value={formData.clienteId}
                  onValueChange={(v) => setFormData((p) => ({ ...p, clienteId: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o cliente..." />
                  </SelectTrigger>
                  <SelectContent>
                    {clientes.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        <span className="flex items-center gap-2">
                          <UserRound className="h-3.5 w-3.5 text-slate-400" />
                          {c.nome}
                          <span className="text-xs text-muted-foreground">{c.email}</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Finalidade */}
            <div className="space-y-1">
              <Label>Finalidade *</Label>
              <Select value={formData.finalidade} onValueChange={(v) => setFormData((p) => ({ ...p, finalidade: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="VENDA">Compra</SelectItem>
                  <SelectItem value="ALUGUEL">Aluguel</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Tipos */}
            <div className="sm:col-span-2 space-y-2">
              <Label>Tipos de imóvel aceitos *</Label>
              <div className="flex flex-wrap gap-4">
                {tipos.map((t) => (
                  <div key={t.id} className="flex items-center gap-2">
                    <Checkbox
                      id={`tipo-${t.id}`}
                      checked={tiposSelecionados.includes(t.id)}
                      onCheckedChange={() => toggleTipo(t.id)}
                    />
                    <label htmlFor={`tipo-${t.id}`} className="text-sm cursor-pointer">{t.nome}</label>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <Label>Preço mínimo (R$) *</Label>
              <Input type="number" min="0" {...field('precoMin')} />
            </div>
            <div className="space-y-1">
              <Label>Preço máximo (R$) *</Label>
              <Input type="number" min="0" {...field('precoMax')} />
            </div>
            <div className="space-y-1">
              <Label>Área mínima (m²)</Label>
              <Input type="number" min="1" {...field('areaMin')} />
            </div>
            <div className="space-y-1">
              <Label>Quartos mínimos</Label>
              <Input type="number" min="1" {...field('quartosMin')} />
            </div>
            <div className="space-y-1">
              <Label>Cidades * <span className="text-xs text-muted-foreground">(separadas por vírgula)</span></Label>
              <Input {...field('cidades')} />
            </div>
            <div className="space-y-1">
              <Label>Bairros preferidos <span className="text-xs text-muted-foreground">(opcional)</span></Label>
              <Input {...field('bairros')} />
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

      {/* Modal Excluir */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Excluir perfil</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir o perfil de{' '}
              <strong>{deleteTarget?.cliente.nome}</strong>? Os matches associados também serão removidos.
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
