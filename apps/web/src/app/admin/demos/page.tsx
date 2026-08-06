'use client'
import { useEffect, useState } from 'react'
import { ClipboardList, Building2, Mail, Phone, Calendar, Trash2, CheckCircle } from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { api } from '@/lib/api'

interface DemoRequest {
  id: string
  nome: string
  email: string
  telefone: string
  empresa: string
  aprovadoEm: string | null
  createdAt: string
}

interface AprovarResult {
  tenant: { id: string; name: string; slug: string }
  adminEmail: string
}

export default function AdminDemosPage() {
  const [demos, setDemos] = useState<DemoRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [aprovando, setAprovando] = useState<string | null>(null)
  const [excluindo, setExcluindo] = useState<string | null>(null)
  const [resultado, setResultado] = useState<AprovarResult | null>(null)

  async function load() {
    try {
      const data = await api.get<DemoRequest[]>('/demo-requests')
      setDemos(data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function handleAprovar(demo: DemoRequest) {
    if (!confirm(`Criar tenant e admin para "${demo.empresa}"?`)) return
    setAprovando(demo.id)
    try {
      const result = await api.post<AprovarResult>(`/demo-requests/${demo.id}/aprovar`, {})
      setResultado(result)
      toast.success(`Tenant "${result.tenant.name}" criado! Credenciais enviadas por email.`)
      load()
    } catch (e: any) {
      toast.error(e?.message ?? 'Erro ao aprovar solicitação')
    } finally {
      setAprovando(null)
    }
  }

  async function handleExcluir(id: string) {
    if (!confirm('Excluir esta solicitação permanentemente?')) return
    setExcluindo(id)
    try {
      await api.delete(`/demo-requests/${id}`)
      toast.success('Solicitação excluída')
      setDemos(prev => prev.filter(d => d.id !== id))
    } catch {
      toast.error('Erro ao excluir solicitação')
    } finally {
      setExcluindo(null)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Solicitações de Demo</h1>
        <p className="text-muted-foreground">Empresas interessadas na plataforma</p>
      </div>

      {resultado && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-4 space-y-3">
            <div className="flex items-center gap-2 text-green-700 font-semibold">
              <CheckCircle className="h-5 w-5" />
              Tenant criado com sucesso!
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="bg-white rounded-lg p-3 border border-green-200">
                <p className="text-xs text-muted-foreground mb-1">Imobiliária</p>
                <p className="font-medium text-sm">{resultado.tenant.name}</p>
              </div>
              <div className="bg-white rounded-lg p-3 border border-green-200">
                <p className="text-xs text-muted-foreground mb-1">Email do admin</p>
                <p className="font-medium text-sm">{resultado.adminEmail}</p>
                <p className="text-xs text-muted-foreground mt-1">Credenciais enviadas por email ✓</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => setResultado(null)}>Fechar</Button>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <p className="text-muted-foreground">Carregando...</p>
      ) : demos.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <ClipboardList className="h-12 w-12 mx-auto mb-4 opacity-20" />
          <p>Nenhuma solicitação recebida.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {demos.map((demo) => {
            const aprovado = !!demo.aprovadoEm
            return (
              <Card key={demo.id} className={aprovado ? 'opacity-60 bg-muted/30' : ''}>
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="space-y-1.5 min-w-0">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                        <p className="font-semibold">{demo.empresa}</p>
                        {aprovado && (
                          <Badge variant="secondary" className="gap-1 text-green-700 bg-green-100 border-green-200">
                            <CheckCircle className="h-3 w-3" />
                            Tenant criado
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm font-medium">{demo.nome}</p>
                      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1.5">
                          <Mail className="h-3.5 w-3.5" />{demo.email}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Phone className="h-3.5 w-3.5" />{demo.telefone}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5" />
                          {new Date(demo.createdAt).toLocaleDateString('pt-BR')}
                        </span>
                        {aprovado && (
                          <span className="flex items-center gap-1.5 text-green-700">
                            <CheckCircle className="h-3.5 w-3.5" />
                            Aprovado em {new Date(demo.aprovadoEm!).toLocaleDateString('pt-BR')}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      {!aprovado && (
                        <Button
                          size="sm"
                          onClick={() => handleAprovar(demo)}
                          disabled={aprovando === demo.id}
                        >
                          <CheckCircle className="h-3.5 w-3.5" />
                          {aprovando === demo.id ? 'Criando...' : 'Criar tenant'}
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600 border-red-200 hover:bg-red-50"
                        onClick={() => handleExcluir(demo.id)}
                        disabled={excluindo === demo.id || aprovado}
                        title={aprovado ? 'Solicitações aprovadas não podem ser excluídas' : ''}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        {excluindo === demo.id ? '...' : 'Excluir'}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
