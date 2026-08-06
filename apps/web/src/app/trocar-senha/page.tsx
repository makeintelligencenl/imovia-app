'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Building2, Eye, EyeOff, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function TrocarSenhaPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [showNova, setShowNova] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    const nova     = form.get('nova') as string
    const confirma = form.get('confirma') as string

    if (nova.length < 8) {
      toast.error('A senha deve ter ao menos 8 caracteres')
      return
    }
    if (nova !== confirma) {
      toast.error('As senhas não coincidem')
      return
    }

    setLoading(true)
    try {
      const token = sessionStorage.getItem('auth_token')
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/change-password`, {
        method:      'POST',
        headers:     {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: 'include',
        body: JSON.stringify({ password: nova }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.message ?? 'Erro ao trocar senha')
      }

      // Atualiza flag no sessionStorage para não redirecionar de novo
      const stored = sessionStorage.getItem('user')
      if (stored) {
        const user = JSON.parse(stored)
        user.forcePasswordChange = false
        sessionStorage.setItem('user', JSON.stringify(user))
      }

      toast.success('Senha atualizada com sucesso!')
      router.replace('/dashboard')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao trocar senha')
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
            "Sua segurança é nossa prioridade."
          </blockquote>
          <p className="mt-3 text-slate-500 text-sm">
            Crie uma senha forte para proteger o acesso da sua imobiliária.
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
            <div className="flex items-center gap-3 mb-5">
              <div className="p-2 rounded-lg bg-amber-100">
                <ShieldCheck className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight">Troca de senha obrigatória</h1>
                <p className="text-sm text-muted-foreground">Crie uma senha pessoal para continuar</p>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 mb-6 text-sm text-amber-800">
              Por segurança, você precisa criar uma nova senha antes de continuar.
              A senha temporária enviada por email não poderá ser usada novamente.
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="nova" className="text-sm font-medium">Nova senha</Label>
                <div className="relative">
                  <Input
                    id="nova"
                    name="nova"
                    type={showNova ? 'text' : 'password'}
                    required
                    minLength={8}
                    placeholder="Mínimo 8 caracteres"
                    className="h-10 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNova((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    tabIndex={-1}
                  >
                    {showNova ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="confirma" className="text-sm font-medium">Confirmar nova senha</Label>
                <div className="relative">
                  <Input
                    id="confirma"
                    name="confirma"
                    type={showConfirm ? 'text' : 'password'}
                    required
                    minLength={8}
                    placeholder="Repita a nova senha"
                    className="h-10 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    tabIndex={-1}
                  >
                    {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-10 font-semibold shadow-sm"
                disabled={loading}
              >
                {loading ? 'Salvando...' : 'Definir nova senha'}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
