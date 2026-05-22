'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Building2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function LoginPage() {
  const router  = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    const form = new FormData(e.currentTarget)
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.get('email'), password: form.get('password') }),
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      localStorage.setItem('token', data.token)
      localStorage.setItem('user', JSON.stringify(data.user))
      if (data.user.role === 'ADMIN' && data.user.tenantId === 'super-admin') {
        router.push('/admin')
      } else {
        router.push('/dashboard')
      }
    } catch {
      toast.error('Email ou senha incorretos')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex" style={{ background: '#F1F5F9' }}>
      {/* Painel esquerdo — branding */}
      <div className="hidden lg:flex flex-col justify-between w-[420px] shrink-0 p-10" style={{ background: '#0F172A' }}>
        <Link href="/" className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-blue-500/20">
            <Building2 className="h-5 w-5 text-blue-400" />
          </div>
          <span className="font-bold text-white text-lg leading-tight">
            Imov<span className="text-blue-400">IA</span>
          </span>
        </Link>
        <div>
          <blockquote className="text-slate-300 text-lg font-medium leading-relaxed">
            "Conectamos imóveis ao comprador certo — automaticamente."
          </blockquote>
          <p className="mt-3 text-slate-500 text-sm">
            Motor de matching com IA para imobiliárias brasileiras.
          </p>
        </div>
        <p className="text-slate-600 text-xs">© {new Date().getFullYear()} ImovIA</p>
      </div>

      {/* Painel direito — formulário */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          {/* Logo mobile */}
          <div className="flex justify-center mb-8 lg:hidden">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl" style={{ background: '#0F172A' }}>
                <Building2 className="h-5 w-5 text-blue-400" />
              </div>
              <span className="font-bold text-[#0F172A] text-lg">Imov<span className="text-blue-600">IA</span></span>
            </Link>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-border p-8">
            <h1 className="text-2xl font-bold tracking-tight mb-1">Bem-vindo</h1>
            <p className="text-sm text-muted-foreground mb-6">Acesse o painel da sua imobiliária</p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-sm font-medium">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="corretor@imobiliaria.com"
                  required
                  className="h-10"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-sm font-medium">Senha</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="••••••••"
                  required
                  className="h-10"
                />
              </div>
              <Button type="submit" className="w-full h-10 mt-2 font-semibold shadow-sm" disabled={loading}>
                {loading ? 'Entrando...' : 'Entrar'}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
