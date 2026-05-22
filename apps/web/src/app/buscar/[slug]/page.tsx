'use client'
import { useState } from 'react'
import { use } from 'react'
import { Building2, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

const TIPOS = ['APARTAMENTO', 'CASA', 'COMERCIAL', 'TERRENO', 'RURAL']

export default function FormularioPublicoPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [tiposSelecionados, setTiposSelecionados] = useState<string[]>([])

  function toggleTipo(tipo: string) {
    setTiposSelecionados((prev) =>
      prev.includes(tipo) ? prev.filter((t) => t !== tipo) : [...prev, tipo],
    )
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (tiposSelecionados.length === 0) {
      toast.error('Selecione ao menos um tipo de imóvel')
      return
    }
    setSaving(true)
    const form = new FormData(e.currentTarget)

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/perfis/publico/${slug}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clienteNome: form.get('clienteNome'),
            clienteEmail: form.get('clienteEmail'),
            clienteWhatsapp: form.get('clienteWhatsapp') || undefined,
            finalidade: form.get('finalidade'),
            tipo: tiposSelecionados,
            precoMin: Number(form.get('precoMin')),
            precoMax: Number(form.get('precoMax')),
            areaMin: Number(form.get('areaMin')),
            cidades: (form.get('cidades') as string).split(',').map((c) => c.trim()),
          }),
        },
      )

      if (!res.ok) throw new Error()
      setSuccess(true)
    } catch {
      toast.error('Erro ao enviar. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Perfil cadastrado!</h2>
          <p className="text-gray-500">
            Assim que encontrarmos um imóvel compatível com o seu perfil, você receberá
            uma notificação por email{' '}
            {document.querySelector<HTMLInputElement>('[name=clienteWhatsapp]')?.value
              ? 'e WhatsApp'
              : ''}
            .
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-lg mx-auto">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-3">
            <Building2 className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">Encontre o imóvel ideal</h1>
          <p className="text-gray-500 mt-2">
            Informe o que você procura e te avisamos quando aparecer.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Seus dados</CardTitle>
            <CardDescription>Vamos notificá-lo quando encontrarmos algo compatível.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label>Seu nome</Label>
                <Input name="clienteNome" placeholder="João Silva" required />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input name="clienteEmail" type="email" placeholder="joao@email.com" required />
              </div>
              <div className="space-y-2">
                <Label>WhatsApp (opcional)</Label>
                <Input name="clienteWhatsapp" placeholder="+55 11 99999-9999" />
              </div>

              <hr />

              <div className="space-y-2">
                <Label>Estou buscando para</Label>
                <Select name="finalidade" required>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="VENDA">Comprar</SelectItem>
                    <SelectItem value="ALUGUEL">Alugar</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Tipo de imóvel (selecione um ou mais)</Label>
                <div className="flex flex-wrap gap-2">
                  {TIPOS.map((tipo) => (
                    <button
                      key={tipo}
                      type="button"
                      onClick={() => toggleTipo(tipo)}
                      className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                        tiposSelecionados.includes(tipo)
                          ? 'bg-primary text-white border-primary'
                          : 'border-gray-300 hover:border-primary'
                      }`}
                    >
                      {tipo}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Preço mínimo (R$)</Label>
                  <Input name="precoMin" type="number" min="0" placeholder="0" required />
                </div>
                <div className="space-y-2">
                  <Label>Preço máximo (R$)</Label>
                  <Input name="precoMax" type="number" min="0" required />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Área mínima (m²)</Label>
                <Input name="areaMin" type="number" min="1" required />
              </div>

              <div className="space-y-2">
                <Label>Cidades de interesse (separe por vírgula)</Label>
                <Input name="cidades" placeholder="São Paulo, Guarulhos" required />
              </div>

              <Button type="submit" className="w-full" size="lg" disabled={saving}>
                {saving ? 'Enviando...' : 'Quero ser notificado'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
