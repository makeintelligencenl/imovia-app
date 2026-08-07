'use client'
import { useEffect, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

interface Caracteristica { id: string; nome: string; ativo: boolean }

export default function CaracteristicasPage() {
  const [lista, setLista]         = useState<Caracteristica[]>([])
  const [loading, setLoading]     = useState(true)
  const [novoNome, setNovoNome]   = useState('')
  const [salvando, setSalvando]   = useState(false)
  const [removendo, setRemovendo] = useState<string | null>(null)

  async function load() {
    try {
      const data = await api.get<Caracteristica[]>('/caracteristicas')
      setLista(data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function handleAdicionar() {
    if (!novoNome.trim()) return
    setSalvando(true)
    try {
      await api.post('/caracteristicas', { nome: novoNome.trim() })
      setNovoNome('')
      toast.success('Característica adicionada')
      load()
    } catch {
      toast.error('Erro ao adicionar característica')
    } finally {
      setSalvando(false)
    }
  }

  async function handleRemover(id: string) {
    if (!confirm('Remover esta característica?')) return
    setRemovendo(id)
    try {
      await api.delete(`/caracteristicas/${id}`)
      toast.success('Característica removida')
      setLista((prev) => prev.filter((c) => c.id !== id))
    } catch {
      toast.error('Erro ao remover')
    } finally {
      setRemovendo(null)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Características de Imóveis</CardTitle>
        <CardDescription>
          Gerencie a lista de características disponíveis para seus imóveis
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            placeholder="Ex: Piscina aquecida"
            value={novoNome}
            onChange={(e) => setNovoNome(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdicionar()}
            className="max-w-sm"
          />
          <Button onClick={handleAdicionar} disabled={salvando || !novoNome.trim()}>
            <Plus className="h-4 w-4 mr-1" />
            Adicionar
          </Button>
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : lista.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma característica cadastrada.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {lista.map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between px-3 py-2 rounded-lg border border-border bg-background hover:bg-muted/30 transition-colors"
              >
                <span className="text-sm">{c.nome}</span>
                <button
                  onClick={() => handleRemover(c.id)}
                  disabled={removendo === c.id}
                  className="text-muted-foreground hover:text-red-600 transition-colors ml-2 shrink-0"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
