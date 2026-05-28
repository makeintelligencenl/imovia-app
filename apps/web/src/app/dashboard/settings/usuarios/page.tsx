'use client'
import { useEffect, useState } from 'react'
import {
  UserPlus, Trash2, Pencil, Check, X, ShieldCheck, User as UserIcon,
} from 'lucide-react'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { getCurrentUser } from '@/lib/auth'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface UsuarioAPI {
  id: string
  name: string
  email: string
  role: 'ADMIN' | 'CORRETOR'
  ativo: boolean
  createdAt: string
}

export default function UsuariosPage() {
  const me = getCurrentUser()

  const [usuarios, setUsuarios] = useState<UsuarioAPI[]>([])
  const [loading,  setLoading]  = useState(true)

  // Form novo usuário
  const [showForm,   setShowForm]   = useState(false)
  const [newName,    setNewName]    = useState('')
  const [newEmail,   setNewEmail]   = useState('')
  const [newPass,    setNewPass]    = useState('')
  const [newRole,    setNewRole]    = useState<'CORRETOR' | 'ADMIN'>('CORRETOR')
  const [saving,     setSaving]     = useState(false)

  // Edição inline
  const [editId,   setEditId]   = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editEmail,setEditEmail]= useState('')
  const [editPass, setEditPass] = useState('')

  useEffect(() => {
    api.get<UsuarioAPI[]>('/users').then(setUsuarios).finally(() => setLoading(false))
  }, [])

  // ── Criar ───────────────────────────────────────────────────────────────────
  async function criarUsuario() {
    if (!newName.trim() || !newEmail.trim() || newPass.length < 8) {
      toast.error('Preencha nome, email e senha (mín. 8 caracteres)')
      return
    }
    if (!me) return
    setSaving(true)
    try {
      const res = await api.post<{ user: UsuarioAPI }>('/auth/register', {
        name:     newName.trim(),
        email:    newEmail.trim(),
        password: newPass,
        tenantId: me.tenantId,
        role:     newRole,
      })
      setUsuarios((prev) => [...prev, res.user])
      setNewName(''); setNewEmail(''); setNewPass(''); setNewRole('CORRETOR'); setShowForm(false)
      toast.success(`${newRole === 'ADMIN' ? 'Admin' : 'Corretor'} criado!`)
    } catch (e: any) {
      toast.error(e?.message ?? 'Erro ao criar usuário')
    } finally {
      setSaving(false)
    }
  }

  // ── Salvar edição ────────────────────────────────────────────────────────────
  async function salvarEdicao(id: string) {
    if (!editName.trim()) { toast.error('Nome obrigatório'); return }
    if (editPass && editPass.length < 8) { toast.error('Senha: mínimo 8 caracteres'); return }
    try {
      const body: any = { name: editName.trim(), email: editEmail.trim() }
      if (editPass) body.password = editPass
      const updated = await api.patch<UsuarioAPI>(`/users/${id}`, body)
      setUsuarios((prev) => prev.map((u) => u.id === id ? { ...u, ...updated } : u))
      setEditId(null)
      toast.success('Usuário atualizado!')
    } catch (e: any) {
      toast.error(e?.message ?? 'Erro ao atualizar')
    }
  }

  // ── Remover ─────────────────────────────────────────────────────────────────
  async function remover(id: string, name: string) {
    if (!confirm(`Remover "${name}"? Os matches atribuídos a ele serão desassociados.`)) return
    try {
      await api.delete<unknown>(`/users/${id}`)
      setUsuarios((prev) => prev.filter((u) => u.id !== id))
      toast.success('Usuário removido')
    } catch (e: any) {
      toast.error(e?.message ?? 'Erro ao remover usuário')
    }
  }

  function iniciarEdicao(u: UsuarioAPI) {
    setEditId(u.id); setEditName(u.name); setEditEmail(u.email); setEditPass('')
    setShowForm(false)
  }

  const admins    = usuarios.filter((u) => u.role === 'ADMIN')
  const corretores = usuarios.filter((u) => u.role === 'CORRETOR')

  return (
    <div className="space-y-6 max-w-2xl">

      {/* ── Admins ── */}
      <Card className="shadow-sm rounded-xl">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-blue-500" /> Administradores
          </CardTitle>
          <CardDescription className="text-xs">
            Acesso total à imobiliária. Podem gerenciar todos os dados e usuários.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {loading ? (
            <p className="text-sm text-muted-foreground py-2 text-center">Carregando...</p>
          ) : admins.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2 text-center">Nenhum admin.</p>
          ) : (
            admins.map((u) => <UsuarioRow key={u.id} u={u} me={me} editId={editId}
              editName={editName} editEmail={editEmail} editPass={editPass}
              setEditName={setEditName} setEditEmail={setEditEmail} setEditPass={setEditPass}
              iniciarEdicao={iniciarEdicao} salvarEdicao={salvarEdicao}
              cancelar={() => setEditId(null)} remover={remover} />)
          )}
        </CardContent>
      </Card>

      {/* ── Corretores ── */}
      <Card className="shadow-sm rounded-xl">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
            <UserIcon className="h-4 w-4 text-slate-500" /> Corretores
          </CardTitle>
          <CardDescription className="text-xs">
            Acesso limitado. Visualizam apenas os matches atribuídos a eles.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {loading ? (
            <p className="text-sm text-muted-foreground py-2 text-center">Carregando...</p>
          ) : corretores.length === 0 && !showForm ? (
            <p className="text-sm text-muted-foreground py-2 text-center">
              Nenhum corretor cadastrado.
            </p>
          ) : (
            corretores.map((u) => <UsuarioRow key={u.id} u={u} me={me} editId={editId}
              editName={editName} editEmail={editEmail} editPass={editPass}
              setEditName={setEditName} setEditEmail={setEditEmail} setEditPass={setEditPass}
              iniciarEdicao={iniciarEdicao} salvarEdicao={salvarEdicao}
              cancelar={() => setEditId(null)} remover={remover} />)
          )}

          {/* ── Form novo usuário ── */}
          {showForm && (
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200 space-y-2 mt-1">
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Nome</Label>
                  <Input value={newName} onChange={(e) => setNewName(e.target.value)}
                    placeholder="João Silva" className="h-7 text-sm" autoFocus />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Email</Label>
                  <Input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="joao@imob.com" className="h-7 text-sm" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Senha (mín. 8 car.)</Label>
                  <Input type="password" value={newPass} onChange={(e) => setNewPass(e.target.value)}
                    placeholder="••••••••" className="h-7 text-sm" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Perfil</Label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value as any)}
                    className="h-7 w-full rounded-md border border-input bg-background px-2 text-sm"
                  >
                    <option value="CORRETOR">Corretor</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-1 justify-end pt-1">
                <button onClick={criarUsuario} disabled={saving}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-md bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 disabled:opacity-50">
                  <Check className="h-3.5 w-3.5" /> Salvar
                </button>
                <button onClick={() => { setShowForm(false); setNewName(''); setNewEmail(''); setNewPass('') }}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-md border text-xs font-medium hover:bg-slate-50">
                  <X className="h-3.5 w-3.5" /> Cancelar
                </button>
              </div>
            </div>
          )}

          {!showForm && (
            <button onClick={() => { setShowForm(true); setEditId(null) }}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg border-2 border-dashed border-slate-200 text-sm text-slate-400 hover:border-blue-300 hover:text-blue-500 transition-colors mt-1">
              <UserPlus className="h-4 w-4" /> Novo usuário
            </button>
          )}
        </CardContent>
      </Card>

      {/* ── Dica ── */}
      <div className="flex items-start gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl">
        <span className="text-amber-500 text-lg leading-none shrink-0">💡</span>
        <p className="text-xs text-amber-700 leading-relaxed">
          Ao remover um corretor, os matches associados a ele são automaticamente desassociados
          (ficam sem corretor). O admin pode redistribuí-los pela tela de Matches.
        </p>
      </div>
    </div>
  )
}

// ─── Componente de linha de usuário ──────────────────────────────────────────
function UsuarioRow({
  u, me, editId,
  editName, editEmail, editPass,
  setEditName, setEditEmail, setEditPass,
  iniciarEdicao, salvarEdicao, cancelar, remover,
}: {
  u: UsuarioAPI
  me: ReturnType<typeof getCurrentUser>
  editId: string | null
  editName: string; editEmail: string; editPass: string
  setEditName: (v: string) => void
  setEditEmail: (v: string) => void
  setEditPass: (v: string) => void
  iniciarEdicao: (u: UsuarioAPI) => void
  salvarEdicao: (id: string) => void
  cancelar: () => void
  remover: (id: string, name: string) => void
}) {
  const isEditing = editId === u.id
  const isMe      = me?.id === u.id

  return (
    <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg border border-slate-200">
      {/* Avatar */}
      <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
        <span className="text-xs font-bold text-blue-600">
          {u.name.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase()}
        </span>
      </div>

      {/* Dados */}
      {isEditing ? (
        <div className="flex-1 grid grid-cols-3 gap-1.5">
          <Input value={editName} onChange={(e) => setEditName(e.target.value)}
            placeholder="Nome" className="h-7 text-sm" autoFocus />
          <Input value={editEmail} onChange={(e) => setEditEmail(e.target.value)}
            placeholder="Email" className="h-7 text-sm" />
          <Input type="password" value={editPass} onChange={(e) => setEditPass(e.target.value)}
            placeholder="Nova senha (opcional)" className="h-7 text-sm"
            onKeyDown={(e) => { if (e.key === 'Enter') salvarEdicao(u.id); if (e.key === 'Escape') cancelar() }} />
        </div>
      ) : (
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="text-sm font-medium text-slate-700 truncate">{u.name}</p>
            {isMe && <span className="text-[10px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded font-medium">você</span>}
          </div>
          <p className="text-xs text-muted-foreground truncate">{u.email}</p>
        </div>
      )}

      {/* Ações */}
      <div className="flex items-center gap-0.5 shrink-0">
        {isEditing ? (
          <>
            <button onClick={() => salvarEdicao(u.id)}
              className="p-1.5 rounded hover:bg-green-50 text-green-600 transition-colors" title="Salvar">
              <Check className="h-4 w-4" />
            </button>
            <button onClick={cancelar}
              className="p-1.5 rounded hover:bg-slate-100 text-slate-400 transition-colors" title="Cancelar">
              <X className="h-4 w-4" />
            </button>
          </>
        ) : (
          <>
            <button onClick={() => iniciarEdicao(u)}
              className="p-1.5 rounded hover:bg-blue-50 text-blue-500 transition-colors" title="Editar">
              <Pencil className="h-4 w-4" />
            </button>
            {!isMe && (
              <button onClick={() => remover(u.id, u.name)}
                className="p-1.5 rounded hover:bg-red-50 text-red-400 transition-colors" title="Remover">
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}
