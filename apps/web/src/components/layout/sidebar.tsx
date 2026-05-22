'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Building2, LayoutDashboard, Home, Users, GitMerge, LogOut } from 'lucide-react'
import { cn } from '@/lib/utils'

interface UserInfo { name: string; email: string; role: string }

const navItems = [
  { href: '/dashboard',         label: 'Dashboard',       icon: LayoutDashboard },
  { href: '/dashboard/imoveis', label: 'Imóveis',         icon: Home },
  { href: '/dashboard/perfis',  label: 'Perfis de Busca', icon: Users },
  { href: '/dashboard/matches', label: 'Matches',         icon: GitMerge },
]

export function Sidebar() {
  const pathname = usePathname()
  const router   = useRouter()
  const [user, setUser] = useState<UserInfo | null>(null)

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem('user')
      if (stored) setUser(JSON.parse(stored))
    } catch {}
  }, [])

  function handleLogout() {
    sessionStorage.removeItem('token')
    sessionStorage.removeItem('user')
    router.push('/login')
  }

  // Gera iniciais do nome (ex: "José Carlos" → "JC")
  function initials(name: string) {
    return name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('')
  }

  return (
    <aside className="w-60 flex flex-col h-screen sticky top-0 shrink-0" style={{ background: '#0F172A' }}>
      {/* Logo */}
      <div className="px-5 py-4 border-b border-white/10">
        <Link href="/dashboard" className="flex items-center gap-2.5 group">
          <div className="p-1.5 rounded-lg bg-blue-500/20">
            <Building2 className="h-4 w-4 text-blue-400" />
          </div>
          <span className="text-sm font-semibold text-white tracking-tight leading-tight">
            Imov<span className="text-blue-400 font-bold">IA</span>
          </span>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
          Menu
        </p>
        {navItems.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
                isActive
                  ? 'bg-blue-500/15 text-blue-400'
                  : 'text-slate-400 hover:bg-white/5 hover:text-slate-200',
              )}
            >
              <item.icon className={cn('h-[18px] w-[18px] shrink-0', isActive && 'text-blue-400')} />
              {item.label}
              {isActive && (
                <span className="ml-auto w-1 h-4 rounded-full bg-blue-400" />
              )}
            </Link>
          )
        })}
      </nav>

      {/* Usuário + Logout */}
      <div className="px-3 py-4 border-t border-white/10 space-y-1">
        {user && (
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-white/5 mb-1">
            {/* Avatar com iniciais */}
            <div className="h-8 w-8 rounded-full bg-blue-500/30 flex items-center justify-center shrink-0">
              <span className="text-xs font-bold text-blue-300">{initials(user.name)}</span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-slate-200 truncate">{user.name}</p>
              <p className="text-[11px] text-slate-500 truncate">{user.email}</p>
            </div>
            {user.role === 'ADMIN' && (
              <span className="shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400">
                Admin
              </span>
            )}
          </div>
        )}
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:bg-white/5 hover:text-slate-200 transition-all duration-150"
        >
          <LogOut className="h-[18px] w-[18px] shrink-0" />
          Sair
        </button>
      </div>
    </aside>
  )
}
