'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Building2, LayoutDashboard, Home, GitMerge, LogOut, ChevronLeft, ChevronRight, Settings2, CalendarDays, UserRound, BarChart2, DollarSign, MessageSquare, KeyRound } from 'lucide-react'
import { cn } from '@/lib/utils'

interface UserInfo { name: string; email: string; role: string }

const NAV_ITEMS_BASE = [
  { href: '/dashboard/imoveis',           label: 'Imóveis',         icon: Home,            adminOnly: false },
  { href: '/dashboard/clientes',          label: 'Clientes',        icon: UserRound,       adminOnly: false },
  { href: '/dashboard/matches',           label: 'Matches',         icon: GitMerge,        adminOnly: false },
  { href: '/dashboard/agenda',            label: 'Agenda',          icon: CalendarDays,    adminOnly: false },
  { href: '/dashboard/relatorios',         label: 'Relatórios',      icon: BarChart2,       adminOnly: true  },
  { href: '/dashboard/financeiro',         label: 'Financeiro',      icon: DollarSign,      adminOnly: true  },
  { href: '/dashboard/aluguel',           label: 'Aluguel',         icon: KeyRound,        adminOnly: true  },
  { href: '/dashboard/chats',             label: 'Chats',           icon: MessageSquare,   adminOnly: true  },
  { href: '/dashboard/settings/pipeline', label: 'Configurações',   icon: Settings2,       adminOnly: true  },
]

export function Sidebar() {
  const pathname = usePathname()
  const router   = useRouter()
  const [user,      setUser]      = useState<UserInfo | null>(null)
  const [collapsed, setCollapsed] = useState(false)

  // Link do Dashboard varia por role
  const dashboardHref = user?.role === 'CORRETOR' ? '/dashboard/corretor' : '/dashboard'

  // NAV com Dashboard no topo, href dinamico
  const NAV_ITEMS = [
    { href: dashboardHref, label: 'Dashboard', icon: LayoutDashboard, adminOnly: false },
    ...NAV_ITEMS_BASE,
  ]

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem('user')
      if (stored) setUser(JSON.parse(stored))
    } catch {}

    // Restaura preferência salva
    const saved = localStorage.getItem('sidebar-collapsed')
    if (saved === 'true') setCollapsed(true)
  }, [])

  function toggleCollapsed() {
    setCollapsed((prev) => {
      localStorage.setItem('sidebar-collapsed', String(!prev))
      return !prev
    })
  }

  function handleLogout() {
    sessionStorage.removeItem('token')
    sessionStorage.removeItem('user')
    router.push('/login')
  }

  function initials(name: string) {
    return name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('')
  }

  return (
    <aside
      className={cn(
        'flex flex-col h-screen sticky top-0 shrink-0 transition-all duration-300 ease-in-out overflow-hidden',
        collapsed ? 'w-16' : 'w-60',
      )}
      style={{ background: '#0F172A' }}
    >
      {/* ── Logo + botão toggle ── */}
      <div className="px-3 py-4 border-b border-white/10 flex items-center justify-between min-h-[57px]">
        {/* Logo — some quando collapsed */}
        <Link
          href="/dashboard"
          className={cn(
            'flex items-center gap-2.5 group transition-all duration-200 overflow-hidden',
            collapsed ? 'w-0 opacity-0 pointer-events-none' : 'w-auto opacity-100',
          )}
        >
          <div className="p-1.5 rounded-lg bg-blue-500/20 shrink-0">
            <Building2 className="h-4 w-4 text-blue-400" />
          </div>
          <span className="text-sm font-semibold text-white tracking-tight leading-tight whitespace-nowrap">
            Imov<span className="text-blue-400 font-bold">IA</span>
          </span>
        </Link>

        {/* Ícone sozinho quando collapsed */}
        {collapsed && (
          <Link href="/dashboard" className="mx-auto">
            <div className="p-1.5 rounded-lg bg-blue-500/20">
              <Building2 className="h-4 w-4 text-blue-400" />
            </div>
          </Link>
        )}

        {/* Botão toggle */}
        <button
          onClick={toggleCollapsed}
          title={collapsed ? 'Expandir menu' : 'Recolher menu'}
          className={cn(
            'flex items-center justify-center h-6 w-6 rounded-md text-slate-400 hover:text-white hover:bg-white/10 transition-all duration-150 shrink-0',
            collapsed && 'hidden',
          )}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
      </div>

      {/* ── Botão expand (visível só quando collapsed) ── */}
      {collapsed && (
        <button
          onClick={toggleCollapsed}
          title="Expandir menu"
          className="mx-auto mt-3 flex items-center justify-center h-7 w-7 rounded-md text-slate-400 hover:text-white hover:bg-white/10 transition-all duration-150"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      )}

      {/* ── Nav ── */}
      <nav className="flex-1 px-2 py-4 space-y-0.5">
        {!collapsed && (
          <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
            Menu
          </p>
        )}
        {NAV_ITEMS.filter((item) => !item.adminOnly || user?.role === 'ADMIN').map((item) => {
          const isDashboardItem = item.href === '/dashboard' || item.href === '/dashboard/corretor'
          const isActive = isDashboardItem
            ? pathname === '/dashboard' || pathname === '/dashboard/corretor'
            : pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
                collapsed && 'justify-center px-2',
                isActive
                  ? 'bg-blue-500/15 text-blue-400'
                  : 'text-slate-400 hover:bg-white/5 hover:text-slate-200',
              )}
            >
              <item.icon className={cn('h-[18px] w-[18px] shrink-0', isActive && 'text-blue-400')} />
              {!collapsed && (
                <>
                  {item.label}
                  {isActive && <span className="ml-auto w-1 h-4 rounded-full bg-blue-400" />}
                </>
              )}
            </Link>
          )
        })}
      </nav>

      {/* ── Usuário + Logout ── */}
      <div className="px-2 py-4 border-t border-white/10 space-y-1">
        {user && (
          <div
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg bg-white/5 mb-1',
              collapsed && 'justify-center px-2',
            )}
            title={collapsed ? `${user.name} (${user.role})` : undefined}
          >
            <div className="h-8 w-8 rounded-full bg-blue-500/30 flex items-center justify-center shrink-0">
              <span className="text-xs font-bold text-blue-300">{initials(user.name)}</span>
            </div>
            {!collapsed && (
              <div className="min-w-0 flex-1 overflow-hidden">
                <p className="text-sm font-medium text-slate-200 truncate">{user.name}</p>
                <p className="text-[11px] text-slate-500 truncate">{user.email}</p>
              </div>
            )}
            {!collapsed && user.role === 'ADMIN' && (
              <span className="shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400">
                Admin
              </span>
            )}
          </div>
        )}
        <button
          onClick={handleLogout}
          title={collapsed ? 'Sair' : undefined}
          className={cn(
            'flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:bg-white/5 hover:text-slate-200 transition-all duration-150',
            collapsed && 'justify-center px-2',
          )}
        >
          <LogOut className="h-[18px] w-[18px] shrink-0" />
          {!collapsed && 'Sair'}
        </button>
      </div>
    </aside>
  )
}
