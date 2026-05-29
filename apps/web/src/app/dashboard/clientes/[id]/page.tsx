'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  ChevronLeft, Pencil, Trash2, Plus, MessageCircle,
  Search, GitMerge,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { api } from '@/lib/api'
import { formatWhatsappLink } from '@/lib/utils'
import Link from 'next/link'

// ─── Interfaces ───────────────────────────────────────────────────────────────

interface Tipo { id: string; nome: string }
interface CorretorResumido { id: string; name: string; email: string }

interface Perfil {
  id: string
  finalidade: 'VENDA' | 'ALUGUEL'
  precoMin: number | string
  precoMax: number | string
  areaMin:  number | string
  quartosMin?: number | null
  cidades: string[]
  bairros: string[]
  tipos: Tipo[]
  _count: { matches: number }
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
  perfis: Perfil[]
  _count: { perfis: number }
}

interface Match {
  id: string
  imovel: { id: string; titulo: string; finalidade: string; preco: string; cidade: { nome: string } }
  etapa:  { id: string; nome: string; cor: string }
  perfil: { id: string }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function initials(name: string) {
  return name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('')
}

function fmtBRL(v: number | string) {
  const n = Number(v)
  if (n >= 1_000_000) return `R$ ${(n / 1_000_000).toFixed(1).replace('.', ',')}M`
  if (n >= 1_000)     return `R$ ${(n / 1_000).toFixed(0)}k`
  return `R$ ${n.toLocaleString('pt-BR')}`
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR')
}

const FINALIDADE_LABEL: Record<string, string> = { VENDA: 'Compra', ALUGUEL: 'Aluguel' }
const FINALIDADE_CLASS: Record<string, string> = {
  VENDA:   'bg-violet-50 text-violet-700 ring-1 ring-violet-200',
  ALUGUEL: 'bg-orange-50 text-orange-700 ring-1 ring-orange-200',
}

// Converte cor hex do pipeline para classes Tailwind legíveis
function etapaStyle(cor: string) {
  return { background: cor + '22', color: cor, border: `1px solid ${cor}55` }
}

// ─── Blank form perfil ─────────────────────────────────────────────────────────
const BLANK_PERFIL = {
  finalidade: 'VENDA' as 'VENDA' | 'ALUGUEL',
  tiposIds:   [] as string[],
  precoMin:   '',
  precoMax:   '',
  areaMin:    '',
  quartosMin: '',
  cidades:    '',
  bairros:    '',
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function ClienteDetalhePage() {
  const { id } = useParams<{ id: string }>()
  const router  = useRouter()

  const [cliente,         setCliente]         = useState<Cliente | null>(null)
  const [matches,         setMatches]         = useState<Match[]>([])
  const [tipos,           setTipos]           = useState<Tipo[]>([])
  const [corretores,      setCorretores]      = useState<CorretorResumido[]>([])
  const [loading,         setLoading]         = useState(true)
  const [selectedPerfil,  setSelectedPerfil]  = useState<string | null>(null)

  // Modal editar cliente
  const [editOpen,   setEditOpen]   = useState(false)
  const [editData,   setEditData]   = useState({ nome:'', email:'', whatsapp:'', telefone:'', cpf:'', observacoes:'', corretorId:'' })
  const [editSaving, setEditSaving] = useState(false)

  // Modal remover cliente
  const [removeOpen, setRemoveOpen] = useState(false)
  const [removing,   setRemoving]   = useState(false)

  // Modal perfil (criar/editar)
  const [perfilMode,   setPerfilMode]   = useState<'criar' | 'editar' | null>(null)
  const [perfilData,   setPerfilData]   = useState({ ...BLANK_PERFIL })
  const [perfilEditId, setPerfilEditId] = useState<string | null>(null)
  const [perfilSaving, setPerfilSaving] = useState(false)

  // Modal remover perfil
  const [removePerfilId, setRemovePerfilId] = useState<string | null>(null)
  const [removingPerfil, setRemovingPerfil] = useState(false)

  // ─── Carregamento ────────────────────────────────────────────────────────────

  async function loadCliente() {
    const data = await api.get<Cliente>(`/clientes/${id}`)
    setCliente(data)
    setLoading(false)
  }

  async function loadMatches() {
    try {
      const data = await api.get<Match[]>(`/matches?clienteId=${id}`)
      setMatches(data)
    } catch {}
  }

  useEffect(() => {
    loadCliente()
    loadMatches()
    api.get<Tipo[]>('/tipos').then(setTipos).catch(() => {})
    api.get<CorretorResumido[]>('/users').then(setCorretores).catch(() => {})
  }, [id])

  // ─── Editar cliente ───────────────────────────────────────────────────────────

  function abrirEditar() {
    if (!cliente) return
    setEditData({
      nome:        cliente.nome,
      email:       cliente.email,
      whatsapp:    cliente.whatsapp    ?? '',
      telefone:    cliente.telefone    ?? '',
      cpf:         cliente.cpf         ?? '',
      observacoes: cliente.observacoes ?? '',
      corretorId:  cliente.corretorId  ?? '',
    })
    setEditOpen(true)
  }

  async function handleSalvarCliente() {
    if (!editData.nome || !editData.email) { toast.error('Nome e e-mail são obrigatórios'); return }
    setEditSaving(true)
    try {
      await api.patch(`/clientes/${id}`, {
        nome:        editData.nome,
        email:       editData.email,
        whatsapp:    editData.whatsapp    || undefined,
        telefone:    editData.telefone    || undefined,
        cpf:         editData.cpf         || undefined,
        observacoes: editData.observacoes || undefined,
        corretorId:  editData.corretorId  || undefined,
      })
      toast.success('Cliente atualizado.')
      setEditOpen(false)
      loadCliente()
    } catch { toast.error('Erro ao salvar') }
    finally  { setEditSaving(false) }
  }

  // ─── Remover cliente ──────────────────────────────────────────────────────────

  async function handleRemover() {
    setRemoving(true)
    try {
      await api.delete(`/clientes/${id}`)
      toast.success('Cliente removido.')
      router.push('/dashboard/clientes')
    } catch { toast.error('Erro ao remover') }
    finally  { setRemoving(false) }
  }

  // ─── Perfis ───────────────────────────────────────────────────────────────────

  function abrirCriarPerfil() {
    setPerfilData({ ...BLANK_PERFIL })
    setPerfilEditId(null)
    setPerfilMode('criar')
  }

  function abrirEditarPerfil(p: Perfil) {
    setPerfilData({
      finalidade: p.finalidade,
      tiposIds:   p.tipos.map(t => t.id),
      precoMin:   String(p.precoMin),
      precoMax:   String(p.precoMax),
      areaMin:    String(p.areaMin),
      quartosMin: p.quartosMin ? String(p.quartosMin) : '',
      cidades:    p.cidades.join(', '),
      bairros:    p.bairros.join(', '),
    })
    setPerfilEditId(p.id)
    setPerfilMode('editar')
  }

  function toggleTipo(tipoId: string) {
    setPerfilData(prev => ({
      ...prev,
      tiposIds: prev.tiposIds.includes(tipoId)
        ? prev.tiposIds.filter(t => t !== tipoId)
        : [...prev.tiposIds, tipoId],
    }))
  }

  async function handleSalvarPerfil() {
    if (!perfilData.tiposIds.length)           { toast.error('Selecione ao menos um tipo'); return }
    if (!perfilData.precoMin || !perfilData.precoMax) { toast.error('Informe a faixa de preço'); return }
    if (!perfilData.cidades)                   { toast.error('Informe ao menos uma cidade'); return }
    if (!perfilData.areaMin)                   { toast.error('Informe a área mínima'); return }

    setPerfilSaving(true)
    const payload = {
      clienteId:  id,
      finalidade: perfilData.finalidade,
      tiposIds:   perfilData.tiposIds,
      precoMin:   Number(perfilData.precoMin),
      precoMax:   Number(perfilData.precoMax),
      areaMin:    Number(perfilData.areaMin),
      quartosMin: perfilData.quartosMin ? Number(perfilData.quartosMin) : undefined,
      cidades:    perfilData.cidades.split(',').map(s => s.trim()).filter(Boolean),
      bairros:    perfilData.bairros  ? perfilData.bairros.split(',').map(s => s.trim()).filter(Boolean) : [],
    }
    try {
      if (perfilMode === 'criar') {
        await api.post('/perfis', payload)
        toast.success('Perfil de busca criado!')
      } else {
        await api.patch(`/perfis/${perfilEditId}`, payload)
        toast.success('Perfil atualizado.')
      }
      setPerfilMode(null)
      loadCliente()
      loadMatches()
    } catch { toast.error('Erro ao salvar perfil') }
    finally  { setPerfilSaving(false) }
  }

  async function handleRemoverPerfil() {
    if (!removePerfilId) return
    setRemovingPerfil(true)
    try {
      await api.delete(`/perfis/${removePerfilId}`)
      toast.success('Perfil removido.')
      setRemovePerfilId(null)
      loadCliente()
      loadMatches()
    } catch { toast.error('Erro ao remover perfil') }
    finally  { setRemovingPerfil(false) }
  }

  // ─── Render ───────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
        Carregando...
      </div>
    )
  }

  if (!cliente) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <p className="text-muted-foreground">Cliente não encontrado.</p>
        <Button variant="outline" onClick={() => router.push('/dashboard/clientes')}>
          <ChevronLeft className="h-4 w-4 mr-1" /> Voltar
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-5">

      {/* ── Breadcrumb + ações ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm">
          <Link href="/dashboard/clientes" className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors">
            <ChevronLeft className="h-4 w-4" /> Clientes
          </Link>
          <span className="text-muted-foreground">/</span>
          <span className="font-semibold text-foreground">{cliente.nome}</span>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={abrirEditar}>
            <Pencil className="h-3.5 w-3.5" /> Editar
          </Button>
          <Button size="sm" variant="destructive" className="gap-1.5" onClick={() => setRemoveOpen(true)}>
            <Trash2 className="h-3.5 w-3.5" /> Remover
          </Button>
        </div>
      </div>

      {/* ── Hero ── */}
      <Card className="shadow-sm rounded-xl">
        <CardContent className="p-5 flex items-center gap-5">
          {/* Avatar */}
          <div className="h-14 w-14 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0">
            <span className="text-xl font-bold text-white">{initials(cliente.nome)}</span>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold tracking-tight">{cliente.nome}</h1>
            <p className="text-sm text-muted-foreground mt-0.5">{cliente.email}</p>
            <div className="flex flex-wrap gap-2 mt-2.5">
              {cliente.corretor && (
                <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200">
                  <svg className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                  {cliente.corretor.name}
                </span>
              )}
              <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 ring-1 ring-blue-200">
                <Search className="h-3 w-3" />
                {cliente.perfis.length} {cliente.perfis.length === 1 ? 'perfil' : 'perfis'} de busca
              </span>
              <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-violet-50 text-violet-700 ring-1 ring-violet-200">
                <GitMerge className="h-3 w-3" />
                {matches.length} {matches.length === 1 ? 'match' : 'matches'}
              </span>
            </div>
          </div>

          {/* Status + data — direita */}
          <div className="flex flex-col items-end gap-2.5 flex-shrink-0">
            <div className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-base ${cliente.ativo ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-300' : 'bg-red-50 text-red-600 ring-1 ring-red-200'}`}>
              <span className={`w-2.5 h-2.5 rounded-full ${cliente.ativo ? 'bg-emerald-500 shadow-[0_0_0_3px_rgba(34,197,94,0.2)]' : 'bg-red-500'}`} />
              {cliente.ativo ? 'Ativo' : 'Inativo'}
            </div>
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Cliente desde</p>
              <p className="text-sm font-semibold text-slate-600 mt-0.5">{fmtDate(cliente.createdAt)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Dados ── */}
      <Card className="shadow-sm rounded-xl">
        <CardHeader className="pb-3 pt-5 px-5">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <svg className="h-4 w-4 text-indigo-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            Dados do cliente
          </CardTitle>
        </CardHeader>
        <CardContent className="px-5 pb-5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide mb-1">WhatsApp</p>
              {cliente.whatsapp ? (
                <a href={formatWhatsappLink(cliente.whatsapp, `Olá ${cliente.nome}!`)} target="_blank" rel="noopener noreferrer"
                   className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-600 hover:text-emerald-700 hover:underline">
                  <MessageCircle className="h-3.5 w-3.5" />{cliente.whatsapp}
                </a>
              ) : <span className="text-sm text-muted-foreground/50 italic">—</span>}
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide mb-1">Telefone</p>
              <p className="text-sm font-medium">{cliente.telefone || <span className="text-muted-foreground/50 italic">—</span>}</p>
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide mb-1">CPF</p>
              <p className="text-sm font-medium">{cliente.cpf || <span className="text-muted-foreground/50 italic">—</span>}</p>
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide mb-1">Corretor responsável</p>
              <p className="text-sm font-medium">{cliente.corretor?.name || <span className="text-muted-foreground/50 italic">Sem responsável</span>}</p>
            </div>
            {cliente.observacoes && (
              <div className="col-span-2 sm:col-span-4">
                <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide mb-1">Observações</p>
                <p className="text-sm text-slate-600 bg-slate-50 rounded-lg px-3 py-2 border border-slate-100">{cliente.observacoes}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── Perfis de Busca ── */}
      <Card className="shadow-sm rounded-xl">
        <CardHeader className="pb-3 pt-5 px-5 flex-row items-center justify-between space-y-0">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Search className="h-4 w-4 text-indigo-500" />
            Perfis de Busca
          </CardTitle>
          <Button size="sm" variant="outline" className="gap-1.5 text-violet-700 border-violet-200 bg-violet-50 hover:bg-violet-100" onClick={abrirCriarPerfil}>
            <Plus className="h-3.5 w-3.5" /> Novo perfil
          </Button>
        </CardHeader>
        <CardContent className="px-5 pb-5">
          {cliente.perfis.length === 0 ? (
            <button
              onClick={abrirCriarPerfil}
              className="w-full border-2 border-dashed border-slate-200 rounded-xl py-10 text-sm text-muted-foreground hover:border-indigo-300 hover:text-indigo-500 hover:bg-indigo-50/30 transition-all flex flex-col items-center gap-2"
            >
              <Plus className="h-5 w-5" />
              Nenhum perfil cadastrado. Clique para adicionar.
            </button>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {cliente.perfis.map(p => (
                <div
                  key={p.id}
                  onClick={() => setSelectedPerfil(prev => prev === p.id ? null : p.id)}
                  className={`border rounded-xl p-4 cursor-pointer transition-all ${
                    selectedPerfil === p.id
                      ? 'border-indigo-400 ring-2 ring-indigo-100 shadow-sm bg-indigo-50/30'
                      : 'border-slate-200 hover:border-indigo-200 hover:shadow-sm'
                  }`}
                >
                  {/* Header */}
                  <div className="flex items-center gap-2 mb-3">
                    <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${FINALIDADE_CLASS[p.finalidade]}`}>
                      {FINALIDADE_LABEL[p.finalidade]}
                    </span>
                    <span className="text-xs text-muted-foreground">{p.tipos.map(t => t.nome).join(', ')}</span>
                    <div className="ml-auto flex gap-1">
                      <button className="p-1 rounded-md text-muted-foreground hover:bg-slate-100 hover:text-slate-700 transition-colors" onClick={e => { e.stopPropagation(); abrirEditarPerfil(p) }}>
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button className="p-1 rounded-md text-muted-foreground hover:bg-red-50 hover:text-red-500 transition-colors" onClick={e => { e.stopPropagation(); setRemovePerfilId(p.id) }}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  {/* Chips */}
                  <div className="flex flex-wrap gap-1.5">
                    <span className="inline-flex items-center gap-1 text-[11px] text-slate-500 bg-slate-50 border border-slate-200 rounded-md px-2 py-0.5">
                      💰 {fmtBRL(p.precoMin)} – {fmtBRL(p.precoMax)}
                    </span>
                    {p.quartosMin && (
                      <span className="inline-flex items-center gap-1 text-[11px] text-slate-500 bg-slate-50 border border-slate-200 rounded-md px-2 py-0.5">
                        🛏 {p.quartosMin}+ quartos
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1 text-[11px] text-slate-500 bg-slate-50 border border-slate-200 rounded-md px-2 py-0.5">
                      📐 {String(p.areaMin)}m²+
                    </span>
                    {p.cidades.map(c => (
                      <span key={c} className="inline-flex items-center gap-1 text-[11px] text-slate-500 bg-slate-50 border border-slate-200 rounded-md px-2 py-0.5">
                        📍 {c}
                      </span>
                    ))}
                  </div>
                  {/* Footer */}
                  <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className={`text-xs font-medium ${selectedPerfil === p.id ? 'text-indigo-600' : 'text-muted-foreground'}`}>
                      <span className="font-semibold text-indigo-600">{p._count.matches}</span> {p._count.matches === 1 ? 'match' : 'matches'}
                    </span>
                    {selectedPerfil === p.id ? (
                      <span className="text-[10px] font-semibold text-indigo-600 bg-indigo-100 px-2 py-0.5 rounded-full">
                        Selecionado
                      </span>
                    ) : (
                      <span className="text-[10px] text-muted-foreground">
                        Clique para ver matches
                      </span>
                    )}
                  </div>
                </div>
              ))}

              {/* Botão adicionar inline */}
              <button
                onClick={abrirCriarPerfil}
                className="border-2 border-dashed border-slate-200 rounded-xl p-4 flex flex-col items-center justify-center gap-2 text-sm text-muted-foreground hover:border-indigo-300 hover:text-indigo-500 hover:bg-indigo-50/30 transition-all min-h-[130px]"
              >
                <Plus className="h-5 w-5" />
                Adicionar perfil
              </button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Matches ── */}
      {(() => {
        const matchesFiltrados = selectedPerfil
          ? matches.filter(m => m.perfil.id === selectedPerfil)
          : []
        const perfilSelecionado = selectedPerfil
          ? cliente.perfis.find(p => p.id === selectedPerfil)
          : null

        return (
          <Card className="shadow-sm rounded-xl">
            <CardHeader className="pb-3 pt-5 px-5 flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <GitMerge className="h-4 w-4 text-indigo-500" />
                Matches
                {perfilSelecionado && (
                  <span className="text-xs font-normal text-muted-foreground">
                    — {FINALIDADE_LABEL[perfilSelecionado.finalidade]} · {perfilSelecionado.tipos.map(t => t.nome).join(', ')}
                    <span className="ml-1.5 text-indigo-600 font-semibold">({matchesFiltrados.length})</span>
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-5">
              {!selectedPerfil ? (
                <div className="flex flex-col items-center justify-center py-10 gap-2 text-muted-foreground">
                  <GitMerge className="h-8 w-8 text-slate-200" />
                  <p className="text-sm">Selecione um perfil de busca para ver os matches.</p>
                </div>
              ) : matchesFiltrados.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Nenhum match encontrado para este perfil.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {matchesFiltrados.map(m => (
                    <div key={m.id} className="border border-slate-200 rounded-xl p-4 hover:border-slate-300 hover:shadow-sm transition-all">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
                          <svg className="h-4 w-4 text-indigo-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>
                        </div>
                        <span
                          className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                          style={etapaStyle(m.etapa.cor)}
                        >
                          {m.etapa.nome}
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-slate-800 leading-tight">{m.imovel.titulo}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        R$ {Number(m.imovel.preco).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} · {m.imovel.finalidade === 'VENDA' ? 'Venda' : 'Aluguel'}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )
      })()}

      {/* ── Modal Editar Cliente ── */}
      <Dialog open={editOpen} onOpenChange={o => !o && setEditOpen(false)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Editar cliente</DialogTitle></DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2 space-y-1">
              <Label>Nome *</Label>
              <Input value={editData.nome} onChange={e => setEditData(p => ({ ...p, nome: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>E-mail *</Label>
              <Input type="email" value={editData.email} onChange={e => setEditData(p => ({ ...p, email: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>WhatsApp</Label>
              <Input value={editData.whatsapp} onChange={e => setEditData(p => ({ ...p, whatsapp: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Telefone</Label>
              <Input value={editData.telefone} onChange={e => setEditData(p => ({ ...p, telefone: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>CPF</Label>
              <Input value={editData.cpf} onChange={e => setEditData(p => ({ ...p, cpf: e.target.value }))} />
            </div>
            <div className="sm:col-span-2 space-y-1">
              <Label>Corretor responsável</Label>
              <Select value={editData.corretorId || '__none__'} onValueChange={v => setEditData(p => ({ ...p, corretorId: v === '__none__' ? '' : v }))}>
                <SelectTrigger><SelectValue placeholder="Sem responsável" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Sem responsável</SelectItem>
                  {corretores.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-2 space-y-1">
              <Label>Observações</Label>
              <textarea rows={2} value={editData.observacoes} onChange={e => setEditData(p => ({ ...p, observacoes: e.target.value }))}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none" />
            </div>
          </div>
          <DialogFooter className="mt-2">
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancelar</Button>
            <Button onClick={handleSalvarCliente} disabled={editSaving}>{editSaving ? 'Salvando...' : 'Salvar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Modal Remover Cliente ── */}
      <Dialog open={removeOpen} onOpenChange={o => !o && setRemoveOpen(false)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Remover cliente</DialogTitle>
            <DialogDescription>Tem certeza que deseja remover <strong>{cliente.nome}</strong>? Os matches serão mantidos no histórico.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRemoveOpen(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleRemover} disabled={removing}>{removing ? 'Removendo...' : 'Remover'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Modal Criar / Editar Perfil ── */}
      <Dialog open={perfilMode !== null} onOpenChange={o => !o && setPerfilMode(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{perfilMode === 'criar' ? 'Novo perfil de busca' : 'Editar perfil de busca'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Finalidade */}
            <div className="space-y-1">
              <Label>Finalidade *</Label>
              <Select value={perfilData.finalidade} onValueChange={v => setPerfilData(p => ({ ...p, finalidade: v as 'VENDA'|'ALUGUEL' }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="VENDA">Compra</SelectItem>
                  <SelectItem value="ALUGUEL">Aluguel</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Tipos */}
            <div className="space-y-1">
              <Label>Tipos de imóvel *</Label>
              <div className="flex flex-wrap gap-2 mt-1">
                {tipos.map(t => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => toggleTipo(t.id)}
                    className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-all ${
                      perfilData.tiposIds.includes(t.id)
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'
                    }`}
                  >
                    {t.nome}
                  </button>
                ))}
              </div>
            </div>

            {/* Preços */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Preço mínimo (R$) *</Label>
                <Input type="number" placeholder="300000" value={perfilData.precoMin} onChange={e => setPerfilData(p => ({ ...p, precoMin: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Preço máximo (R$) *</Label>
                <Input type="number" placeholder="800000" value={perfilData.precoMax} onChange={e => setPerfilData(p => ({ ...p, precoMax: e.target.value }))} />
              </div>
            </div>

            {/* Área + Quartos */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Área mínima (m²) *</Label>
                <Input type="number" placeholder="60" value={perfilData.areaMin} onChange={e => setPerfilData(p => ({ ...p, areaMin: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Quartos mínimos</Label>
                <Input type="number" placeholder="2" value={perfilData.quartosMin} onChange={e => setPerfilData(p => ({ ...p, quartosMin: e.target.value }))} />
              </div>
            </div>

            {/* Cidades */}
            <div className="space-y-1">
              <Label>Cidades * <span className="text-xs text-muted-foreground font-normal">(separadas por vírgula)</span></Label>
              <Input placeholder="Belo Horizonte, Contagem" value={perfilData.cidades} onChange={e => setPerfilData(p => ({ ...p, cidades: e.target.value }))} />
            </div>

            {/* Bairros */}
            <div className="space-y-1">
              <Label>Bairros <span className="text-xs text-muted-foreground font-normal">(opcional, separados por vírgula)</span></Label>
              <Input placeholder="Savassi, Belvedere" value={perfilData.bairros} onChange={e => setPerfilData(p => ({ ...p, bairros: e.target.value }))} />
            </div>
          </div>
          <DialogFooter className="mt-2">
            <Button variant="outline" onClick={() => setPerfilMode(null)}>Cancelar</Button>
            <Button onClick={handleSalvarPerfil} disabled={perfilSaving}>
              {perfilSaving ? 'Salvando...' : perfilMode === 'criar' ? 'Criar perfil' : 'Salvar alterações'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Modal Remover Perfil ── */}
      <Dialog open={!!removePerfilId} onOpenChange={o => !o && setRemovePerfilId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Remover perfil de busca</DialogTitle>
            <DialogDescription>Isso removerá o perfil e todos os matches associados. Essa ação não pode ser desfeita.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRemovePerfilId(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleRemoverPerfil} disabled={removingPerfil}>
              {removingPerfil ? 'Removendo...' : 'Remover'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  )
}
