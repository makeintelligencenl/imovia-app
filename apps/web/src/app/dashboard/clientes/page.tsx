'use client'
import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, Search, X, MessageCircle, UserRound, GitMerge } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Card, CardContent } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { TablePagination } from '@/components/ui/table-pagination'
import { api } from '@/lib/api'
import { formatWhatsappLink } from '@/lib/utils'
import Link from 'next/link'

interface CorretorResumido {
  id: string
  name: string
  email: string
}

interface PerfilResumido {
  id: string
  finalidade: 'VENDA' | 'ALUGUEL'
  cidades: string[]
}

interface Cliente {
  id: string
  nome: string
  email: string
  whatsapp?: string
  telefone?: string
  cpf?: string
  observacoes?: string
  corretorId?: string
  corretor?: CorretorResumido
  ativo: boolean
  createdAt: string
  _count: { perfis: number }
  perfis: PerfilResumido[]
}

interface UserSession {
  id: string
  role: 'ADMIN' | 'CORRETOR'
}

const BLANK_FORM = {
  nome: '', email: '', whatsapp: '', telefone: '', cpf: '', observacoes: '', corretorId: '',
}

const FINALIDADE_BADGE: Record<string, string> = {
  VENDA:   'bg-violet-50 text-violet-700 ring-1 ring-violet-200',
  ALUGUEL: 'bg-orange-50 text-orange-700 ring-1 ring-orange-200',
}

export default function ClientesPage() {
  const [clientes,   setClientes]   = useState<Cliente[]>([])
  const [corretores, setCorretores] = useState<CorretorResumido[]>([])
  const [userSession, setUserSession] = useState<UserSession | null>(null)
  const [loading,    setLoading]    = useState(true)
  const [search,     setSearch]     = useState('')

  const [formMode, setFormMode] = useState<'criar' | 'editar' | null>(null)
  const [formData, setFormData] = useState({ ...BLANK_FORM })
  const [editId,   setEditId]   = useState<string | null>(null)
  const [saving,   setSaving]   = useState(false)

  const [deleteTarget, setDeleteTarget] = useState<Cliente | null>(null)
  const [deleting,     setDeleting]     = useState(false)

  const [page,     setPage]     = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const isAdmin = userSession?.role === 'ADMIN'

  // Sessão do usuário logado
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem('user')
      if (stored) {
        const u = JSON.parse(stored)
        setUserSession({ id: u.id ?? u.sub ?? '', role: u.role })
      }
    } catch {}
  }, [])

  async function load(q?: string) {
    try {
      const params = q ? `?search=${encodeURIComponent(q)}` : ''
      const data   = await api.get<Cliente[]>(`/clientes${params}`)
      setClientes(data)
    } finally {
      setLoading(false)
    }
  }

  async function loadCorretores() {
    try {
      const data = await api.get<CorretorResumido[]>('/users')
      setCorretores(data)
    } catch {}
  }

  useEffect(() => { load(); loadCorretores() }, [])

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => load(search), 300)
    return () => clearTimeout(t)
  }, [search])

  function field(name: keyof typeof BLANK_FORM) {
    return {
      value: formData[name],
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        setFormData((prev) => ({ ...prev, [name]: e.target.value })),
    }
  }

  function abrirCriar() {
    setFormData({ ...BLANK_FORM })
    setEditId(null)
    setFormMode('criar')
  }

  function abrirEditar(c: Cliente) {
    setFormData({
      nome:        c.nome,
      email:       c.email,
      whatsapp:    c.whatsapp    ?? '',
      telefone:    c.telefone    ?? '',
      cpf:         c.cpf         ?? '',
      observacoes: c.observacoes ?? '',
      corretorId:  c.corretorId  ?? '',
    })
    setEditId(c.id)
    setFormMode('editar')
  }

  async function handleSalvar() {
    if (!formData.nome || !formData.email) {
      toast.error('Nome e e-mail são obrigatórios')
      return
    }
    setSaving(true)
    const payload = {
      nome:        formData.nome,
      email:       formData.email,
      whatsapp:    formData.whatsapp    || undefined,
      telefone:    formData.telefone    || undefined,
      cpf:         formData.cpf         || undefined,
      observacoes: formData.observacoes || undefined,
      corretorId:  formData.corretorId  || undefined,
    }
    try {
      if (formMode === 'criar') {
        await api.post('/clientes', payload)
        toast.success('Cliente cadastrado!')
      } else {
        await api.patch(`/clientes/${editId}`, payload)
        toast.success('Cliente atualizado.')
      }
      setFormMode(null)
      load(search)
    } catch {
      toast.error('Erro ao salvar cliente')
    } finally {
      setSaving(false)
    }
  }

  async function handleExcluir() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await api.delete(`/clientes/${deleteTarget.id}`)
      toast.success('Cliente removido.')
      setDeleteTarget(null)
      load(search)
    } catch {
      toast.error('Erro ao remover cliente')
    } finally {
      setDeleting(false)
    }
  }

  const paginados = clientes.slice((page - 1) * pageSize, page * pageSize)

  return (
    <div className="space-y-4">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Clientes</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {loading ? 'Carregando...' : `${clientes.length} cliente(s)`}
          </p>
        </div>
        <Button onClick={abrirCriar} className="gap-2 shadow-sm">
          <Plus className="h-4 w-4" /> Novo cliente
        </Button>
      </div>

      {/* Busca */}
      <Card className="shadow-sm rounded-xl">
        <CardContent className="pt-4 pb-3">
          <div className="relative max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-8"
              placeholder="Nome, e-mail ou WhatsApp..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            />
            {search && (
              <button
                className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                onClick={() => { setSearch(''); setPage(1) }}
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tabela */}
      <Card className="shadow-sm rounded-xl overflow-hidden">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Contato</TableHead>
                <TableHead>CPF</TableHead>
                <TableHead>Corretor</TableHead>
                <TableHead>Perfis de Busca</TableHead>
                <TableHead>Observações</TableHead>
                <TableHead className="w-20 text-center">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : clientes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-16 text-center">
                    <UserRound className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
                    <p className="text-sm text-muted-foreground">
                      {search ? 'Nenhum cliente encontrado.' : 'Nenhum cliente cadastrado ainda.'}
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                paginados.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <p className="font-medium text-sm">{c.nome}</p>
                      <p className="text-xs text-muted-foreground">{c.email}</p>
                    </TableCell>
                    <TableCell>
                      {c.whatsapp && (
                        <a
                          href={formatWhatsappLink(c.whatsapp, `Olá ${c.nome}!`)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-700 hover:underline"
                        >
                          <MessageCircle className="h-3 w-3 shrink-0" />
                          {c.whatsapp}
                        </a>
                      )}
                      {c.telefone && (
                        <p className="text-xs text-muted-foreground mt-0.5">{c.telefone}</p>
                      )}
                      {!c.whatsapp && !c.telefone && (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-muted-foreground">{c.cpf || '—'}</span>
                    </TableCell>
                    <TableCell>
                      {c.corretor ? (
                        <span className="text-xs font-medium text-slate-700">{c.corretor.name}</span>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">Sem responsável</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {c.perfis.length === 0 ? (
                        <span className="text-xs text-muted-foreground italic">Sem perfis</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {c.perfis.map((p) => (
                            <Link
                              key={p.id}
                              href={`/dashboard/perfis`}
                              title={p.cidades.join(', ')}
                            >
                              <span className={`inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full cursor-pointer hover:opacity-75 ${FINALIDADE_BADGE[p.finalidade]}`}>
                                {p.finalidade === 'VENDA' ? 'Compra' : 'Aluguel'}
                              </span>
                            </Link>
                          ))}
                          <Link href={`/dashboard/matches?label=${encodeURIComponent(c.nome)}`}>
                            <span className="inline-flex items-center gap-0.5 text-[10px] text-slate-500 hover:text-slate-700 px-1.5 py-0.5 rounded bg-slate-100 cursor-pointer">
                              <GitMerge className="h-3 w-3" />
                              Matches
                            </span>
                          </Link>
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="max-w-[160px]">
                      <p className="text-xs text-muted-foreground truncate" title={c.observacoes ?? ''}>
                        {c.observacoes || '—'}
                      </p>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center gap-1">
                        <Button size="icon" variant="ghost" className="h-7 w-7" title="Editar" onClick={() => abrirEditar(c)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" title="Remover" onClick={() => setDeleteTarget(c)}>
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
            total={clientes.length}
            page={page}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={(s) => { setPageSize(s); setPage(1) }}
          />
        </CardContent>
      </Card>

      {/* Modal Criar / Editar */}
      <Dialog open={formMode !== null} onOpenChange={(open) => !open && setFormMode(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{formMode === 'criar' ? 'Novo cliente' : 'Editar cliente'}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2 space-y-1">
              <Label>Nome *</Label>
              <Input placeholder="João Silva" {...field('nome')} />
            </div>
            <div className="space-y-1">
              <Label>E-mail *</Label>
              <Input type="email" placeholder="joao@email.com" {...field('email')} />
            </div>
            <div className="space-y-1">
              <Label>WhatsApp</Label>
              <Input placeholder="+5531999999999" {...field('whatsapp')} />
            </div>
            <div className="space-y-1">
              <Label>Telefone</Label>
              <Input placeholder="+5531333334444" {...field('telefone')} />
            </div>
            <div className="space-y-1">
              <Label>CPF</Label>
              <Input placeholder="123.456.789-00" {...field('cpf')} />
            </div>

            {/* Corretor responsável — ADMIN vê todos; CORRETOR vê só ele mesmo */}
            <div className="sm:col-span-2 space-y-1">
              <Label>Corretor responsável</Label>
              <Select
                value={formData.corretorId || '__none__'}
                onValueChange={(v) =>
                  setFormData((prev) => ({ ...prev, corretorId: v === '__none__' ? '' : v }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sem responsável definido" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Sem responsável definido</SelectItem>
                  {(isAdmin ? corretores : corretores.filter((u) => u.id === userSession?.id)).map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="sm:col-span-2 space-y-1">
              <Label>Observações</Label>
              <textarea
                rows={2}
                placeholder="Preferências, notas de atendimento..."
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                {...field('observacoes')}
              />
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

      {/* Modal Confirmar Remoção */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Remover cliente</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja remover <strong>{deleteTarget?.nome}</strong>?
              Os perfis de busca e matches associados serão mantidos no histórico.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleExcluir} disabled={deleting}>
              {deleting ? 'Removendo...' : 'Remover'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
