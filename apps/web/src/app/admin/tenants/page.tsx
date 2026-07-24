'use client'
import { useEffect, useState } from 'react'
import { Plus, Building2, Copy } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { api } from '@/lib/api'

interface Tenant {
  id: string
  name: string
  slug: string
  email?: string
  telefone?: string
  ativo: boolean
  createdAt: string
}

export default function AdminTenantsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)

  async function load() {
    try {
      const data = await api.get<Tenant[]>('/tenants')
      setTenants(data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaving(true)
    const form = new FormData(e.currentTarget)
    try {
      await api.post('/tenants', {
        name: form.get('name'),
        slug: form.get('slug'),
        email: form.get('email') || undefined,
        telefone: form.get('telefone') || undefined,
      })
      toast.success('Imobiliária criada!')
      setShowForm(false)
      load()
    } catch {
      toast.error('Erro ao criar imobiliária. Verifique se o slug já existe.')
    } finally {
      setSaving(false)
    }
  }

  function copyLink(slug: string) {
    const url = `${window.location.origin}/buscar/${slug}`
    navigator.clipboard.writeText(url)
    toast.success('Link do formulário público copiado!')
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Imobiliárias</h1>
          <p className="text-muted-foreground">Gerenciar tenants da plataforma</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="h-4 w-4" /> Nova imobiliária
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader><CardTitle>Cadastrar imobiliária</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input name="name" required />
              </div>
              <div className="space-y-2">
                <Label>Slug (identificador único)</Label>
                <Input name="slug" required />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input name="email" type="email" />
              </div>
              <div className="space-y-2">
                <Label>Telefone</Label>
                <Input name="telefone" />
              </div>
              <div className="md:col-span-2 flex gap-2">
                <Button type="submit" disabled={saving}>{saving ? 'Criando...' : 'Criar imobiliária'}</Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {loading ? (
          <p className="text-muted-foreground">Carregando...</p>
        ) : tenants.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Building2 className="h-12 w-12 mx-auto mb-4 opacity-20" />
            <p>Nenhuma imobiliária cadastrada.</p>
          </div>
        ) : (
          tenants.map((tenant) => (
            <Card key={tenant.id}>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold">{tenant.name}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${tenant.ativo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {tenant.ativo ? 'Ativo' : 'Inativo'}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">slug: {tenant.slug}</p>
                    {tenant.email && <p className="text-sm text-muted-foreground">{tenant.email}</p>}
                  </div>
                  <Button variant="outline" size="sm" onClick={() => copyLink(tenant.slug)}>
                    <Copy className="h-3.5 w-3.5" />
                    Copiar link público
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
