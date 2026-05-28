'use client'
import { useEffect, useState } from 'react'
import {
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Pencil,
  Check,
  X,
  GripVertical,
} from 'lucide-react'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface PipelineEtapa {
  id: string
  nome: string
  cor: string
  ordem: number
  ativo: boolean
}

const COR_PADRAO = '#6B7280'

export default function PipelinePage() {
  const [etapas,   setEtapas]   = useState<PipelineEtapa[]>([])
  const [loading,  setLoading]  = useState(true)

  // Form nova etapa
  const [showForm, setShowForm] = useState(false)
  const [newNome,  setNewNome]  = useState('')
  const [newCor,   setNewCor]   = useState(COR_PADRAO)
  const [saving,   setSaving]   = useState(false)

  // Edição inline
  const [editId,   setEditId]   = useState<string | null>(null)
  const [editNome, setEditNome] = useState('')
  const [editCor,  setEditCor]  = useState('')

  useEffect(() => {
    api.get<PipelineEtapa[]>('/pipeline/etapas')
      .then(setEtapas)
      .finally(() => setLoading(false))
  }, [])

  // ── Criar ───────────────────────────────────────────────────────────────────
  async function criarEtapa() {
    if (!newNome.trim()) { toast.error('Nome obrigatório'); return }
    setSaving(true)
    try {
      const nova = await api.post<PipelineEtapa>('/pipeline/etapas', {
        nome: newNome.trim(),
        cor: newCor,
        ordem: etapas.length + 1,
      })
      setEtapas((prev) => [...prev, nova])
      setNewNome(''); setNewCor(COR_PADRAO); setShowForm(false)
      toast.success('Etapa criada!')
    } catch (e: any) {
      toast.error(e?.message ?? 'Erro ao criar etapa')
    } finally {
      setSaving(false)
    }
  }

  // ── Salvar edição ────────────────────────────────────────────────────────────
  async function salvarEdicao(id: string) {
    if (!editNome.trim()) { toast.error('Nome obrigatório'); return }
    try {
      const atualizada = await api.patch<PipelineEtapa>(`/pipeline/etapas/${id}`, {
        nome: editNome.trim(),
        cor:  editCor,
      })
      setEtapas((prev) => prev.map((e) => e.id === id ? { ...e, ...atualizada } : e))
      setEditId(null)
      toast.success('Etapa atualizada!')
    } catch (e: any) {
      toast.error(e?.message ?? 'Erro ao atualizar etapa')
    }
  }

  // ── Remover ─────────────────────────────────────────────────────────────────
  async function remover(id: string) {
    if (!confirm('Remover esta etapa? Não é possível remover se houver matches nela.')) return
    try {
      await api.delete<unknown>(`/pipeline/etapas/${id}`)
      setEtapas((prev) => prev.filter((e) => e.id !== id))
      toast.success('Etapa removida')
    } catch (e: any) {
      // Extrai mensagem de erro do servidor
      let msg = 'Erro ao remover etapa'
      try { const parsed = JSON.parse(e?.message); msg = parsed?.message ?? msg } catch {}
      toast.error(msg)
    }
  }

  // ── Reordenar ────────────────────────────────────────────────────────────────
  async function mover(index: number, direcao: 'up' | 'down') {
    const alvo = direcao === 'up' ? index - 1 : index + 1
    if (alvo < 0 || alvo >= etapas.length) return

    const novas = [...etapas]
    ;[novas[index], novas[alvo]] = [novas[alvo], novas[index]]
    setEtapas(novas) // optimistic

    try {
      await api.patch<unknown>('/pipeline/etapas/reorder', { ids: novas.map((e) => e.id) })
    } catch {
      setEtapas(etapas) // reverte
      toast.error('Erro ao reordenar')
    }
  }

  function iniciarEdicao(etapa: PipelineEtapa) {
    setEditId(etapa.id)
    setEditNome(etapa.nome)
    setEditCor(etapa.cor)
    setShowForm(false)
  }

  return (
    <div className="space-y-6 max-w-2xl">

      {/* ── Lista de etapas ── */}
      <Card className="shadow-sm rounded-xl">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-slate-700">Etapas cadastradas</CardTitle>
          <CardDescription className="text-xs">
            As etapas são exibidas na mesma ordem do Kanban de matches.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {loading && (
            <p className="text-sm text-muted-foreground py-4 text-center">Carregando...</p>
          )}

          {!loading && etapas.length === 0 && (
            <p className="text-sm text-muted-foreground py-4 text-center">
              Nenhuma etapa cadastrada.
            </p>
          )}

          {etapas.map((etapa, i) => (
            <div
              key={etapa.id}
              className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg border border-slate-200 group"
            >
              {/* Grip (decorativo) */}
              <GripVertical className="h-4 w-4 text-slate-300 shrink-0" />

              {/* Número */}
              <span className="text-xs text-slate-400 w-4 text-center font-mono shrink-0">
                {i + 1}
              </span>

              {/* Cor */}
              {editId === etapa.id ? (
                <input
                  type="color"
                  value={editCor}
                  onChange={(e) => setEditCor(e.target.value)}
                  className="h-7 w-7 rounded cursor-pointer border border-slate-300 p-0.5 shrink-0"
                  title="Escolher cor"
                />
              ) : (
                <div
                  className="h-6 w-6 rounded-full shrink-0 border-2 border-white shadow-sm"
                  style={{ backgroundColor: etapa.cor }}
                  title={etapa.cor}
                />
              )}

              {/* Nome */}
              {editId === etapa.id ? (
                <Input
                  value={editNome}
                  onChange={(e) => setEditNome(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') salvarEdicao(etapa.id)
                    if (e.key === 'Escape') setEditId(null)
                  }}
                  className="h-7 text-sm flex-1"
                  autoFocus
                />
              ) : (
                <span className="flex-1 text-sm font-medium text-slate-700">{etapa.nome}</span>
              )}

              {/* Ações */}
              <div className="flex items-center gap-0.5 shrink-0">
                {editId === etapa.id ? (
                  <>
                    <button
                      onClick={() => salvarEdicao(etapa.id)}
                      className="p-1.5 rounded hover:bg-green-50 text-green-600 transition-colors"
                      title="Salvar (Enter)"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setEditId(null)}
                      className="p-1.5 rounded hover:bg-slate-100 text-slate-400 transition-colors"
                      title="Cancelar (Esc)"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => mover(i, 'up')}
                      disabled={i === 0}
                      className="p-1.5 rounded hover:bg-slate-200 text-slate-400 disabled:opacity-20 transition-colors"
                      title="Mover para cima"
                    >
                      <ChevronUp className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => mover(i, 'down')}
                      disabled={i === etapas.length - 1}
                      className="p-1.5 rounded hover:bg-slate-200 text-slate-400 disabled:opacity-20 transition-colors"
                      title="Mover para baixo"
                    >
                      <ChevronDown className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => iniciarEdicao(etapa)}
                      className="p-1.5 rounded hover:bg-blue-50 text-blue-500 transition-colors"
                      title="Editar"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => remover(etapa.id)}
                      className="p-1.5 rounded hover:bg-red-50 text-red-400 transition-colors"
                      title="Remover"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}

          {/* ── Form nova etapa ── */}
          {showForm && (
            <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg border border-blue-200 mt-1">
              <GripVertical className="h-4 w-4 text-slate-300 shrink-0" />
              <span className="text-xs text-slate-400 w-4 text-center font-mono shrink-0">
                {etapas.length + 1}
              </span>
              <input
                type="color"
                value={newCor}
                onChange={(e) => setNewCor(e.target.value)}
                className="h-7 w-7 rounded cursor-pointer border border-slate-300 p-0.5 shrink-0"
                title="Escolher cor"
              />
              <Input
                value={newNome}
                onChange={(e) => setNewNome(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') criarEtapa()
                  if (e.key === 'Escape') { setShowForm(false); setNewNome(''); setNewCor(COR_PADRAO) }
                }}
                placeholder="Nome da etapa..."
                className="h-7 text-sm flex-1"
                autoFocus
              />
              <div className="flex items-center gap-0.5 shrink-0">
                <button
                  onClick={criarEtapa}
                  disabled={saving}
                  className="p-1.5 rounded hover:bg-green-100 text-green-600 transition-colors disabled:opacity-50"
                  title="Salvar (Enter)"
                >
                  <Check className="h-4 w-4" />
                </button>
                <button
                  onClick={() => { setShowForm(false); setNewNome(''); setNewCor(COR_PADRAO) }}
                  className="p-1.5 rounded hover:bg-slate-100 text-slate-400 transition-colors"
                  title="Cancelar (Esc)"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* ── Botão nova etapa ── */}
          {!showForm && (
            <button
              onClick={() => { setShowForm(true); setEditId(null) }}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg border-2 border-dashed border-slate-200 text-sm text-slate-400 hover:border-blue-300 hover:text-blue-500 transition-colors mt-1"
            >
              <Plus className="h-4 w-4" />
              Nova etapa
            </button>
          )}
        </CardContent>
      </Card>

      {/* ── Dica ── */}
      <div className="flex items-start gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl">
        <span className="text-amber-500 text-lg leading-none shrink-0">💡</span>
        <p className="text-xs text-amber-700 leading-relaxed">
          Etapas com matches vinculados não podem ser removidas. Para desativar uma etapa, mova
          primeiro os matches para outra etapa no Kanban.
        </p>
      </div>
    </div>
  )
}
