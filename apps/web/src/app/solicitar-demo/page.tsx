'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Building2, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'
import { Turnstile } from '@marsidev/react-turnstile'
import type { TurnstileInstance } from '@marsidev/react-turnstile'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function SolicitarDemoPage() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null)
  const turnstileRef = useRef<TurnstileInstance>(null)
  const [countdown, setCountdown] = useState(5)

  // Redireciona pra home automaticamente após o envio, com contagem regressiva
  useEffect(() => {
    if (!success) return
    if (countdown === 0) {
      router.push('/')
      return
    }
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000)
    return () => clearTimeout(timer)
  }, [success, countdown, router])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!turnstileToken) {
      toast.error('Verificação de segurança pendente. Aguarde.')
      return
    }
    setSaving(true)
    const form = new FormData(e.currentTarget)

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/demo-requests`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome:             form.get('nome'),
          email:            form.get('email'),
          telefone:         form.get('telefone'),
          empresa:          form.get('empresa'),
          cfTurnstileToken: turnstileToken,
        }),
      })

      if (!res.ok) throw new Error()
      setSuccess(true)
    } catch {
      toast.error('Erro ao enviar. Tente novamente.')
      turnstileRef.current?.reset()
      setTurnstileToken(null)
    } finally {
      setSaving(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: '#F1F5F9' }}>
        <div className="text-center max-w-md">
          <CheckCircle2 className="h-16 w-16 text-emerald-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Recebemos seu pedido!</h2>
          <p className="text-muted-foreground">
            Nosso time vai entrar em contato em breve para agendar sua demonstração.
          </p>
          <p className="text-sm text-muted-foreground mt-4">
            Redirecionando em {countdown} segundo{countdown !== 1 ? 's' : ''} para página principal do ImovIA.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen py-12 px-4" style={{ background: '#F1F5F9' }}>
      <div className="max-w-lg mx-auto">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2.5 mb-6">
            <div className="p-2 rounded-xl" style={{ background: '#0F172A' }}>
              <Building2 className="h-5 w-5 text-blue-400" />
            </div>
            <span className="font-bold text-[#0F172A] text-lg">Imov<span className="text-blue-600">IA</span></span>
          </Link>
          <h1 className="text-2xl font-bold tracking-tight">Solicitar demonstração</h1>
          <p className="text-muted-foreground mt-2">
            Preencha seus dados e nosso time entra em contato para te mostrar o ImovIA na prática.
          </p>
        </div>

        <Card className="rounded-2xl shadow-sm">
          <CardHeader>
            <CardTitle>Seus dados</CardTitle>
            <CardDescription>Levamos menos de 1 minuto para agendar.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="nome">Nome</Label>
                <Input id="nome" name="nome" required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="telefone">Telefone</Label>
                <Input id="telefone" name="telefone" required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="empresa">Nome da empresa</Label>
                <Input id="empresa" name="empresa" required />
              </div>

              <Turnstile
                ref={turnstileRef}
                siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY!}
                onSuccess={setTurnstileToken}
                onError={() => setTurnstileToken(null)}
                onExpire={() => setTurnstileToken(null)}
                options={{ theme: 'light', language: 'pt-BR' }}
              />

              <Button type="submit" className="w-full h-10 font-semibold" disabled={saving || !turnstileToken}>
                {saving ? 'Enviando...' : 'Solicitar demonstração'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
