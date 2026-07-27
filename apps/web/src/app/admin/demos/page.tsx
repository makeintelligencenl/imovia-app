'use client'
import { useEffect, useState } from 'react'
import { ClipboardList, Building2, Mail, Phone, Calendar } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { api } from '@/lib/api'

interface DemoRequest {
  id: string
  nome: string
  email: string
  telefone: string
  empresa: string
  createdAt: string
}

export default function AdminDemosPage() {
  const [demos, setDemos] = useState<DemoRequest[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get<DemoRequest[]>('/demo-requests')
      .then(setDemos)
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Solicitações de Demo</h1>
        <p className="text-muted-foreground">Empresas interessadas na plataforma</p>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Carregando...</p>
      ) : demos.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <ClipboardList className="h-12 w-12 mx-auto mb-4 opacity-20" />
          <p>Nenhuma solicitação recebida.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {demos.map((demo) => (
            <Card key={demo.id}>
              <CardContent className="pt-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <p className="font-semibold">{demo.empresa}</p>
                    </div>
                    <p className="text-sm font-medium">{demo.nome}</p>
                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <Mail className="h-3.5 w-3.5" />
                        {demo.email}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Phone className="h-3.5 w-3.5" />
                        {demo.telefone}
                      </span>
                    </div>
                  </div>
                  <span className="flex items-center gap-1.5 text-xs text-muted-foreground whitespace-nowrap">
                    <Calendar className="h-3.5 w-3.5" />
                    {new Date(demo.createdAt).toLocaleDateString('pt-BR')}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card>
        <CardHeader><CardTitle className="text-sm">Total</CardTitle></CardHeader>
        <CardContent>
          <p className="text-3xl font-bold">{demos.length}</p>
          <p className="text-sm text-muted-foreground">solicitações recebidas</p>
        </CardContent>
      </Card>
    </div>
  )
}
