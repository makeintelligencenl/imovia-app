'use client'
import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  Building2, LayoutDashboard, Home, GitMerge, LogOut, ChevronLeft,
  ChevronRight, Settings2, CalendarDays, UserRound, BarChart2,
  DollarSign, MessageSquare, X, KeyRound,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface UserInfo { name: string; email: string; role: string; tenantName?: string }

interface NavItem { href: string; label: string; icon: React.ElementType; adminOnly: boolean }
interface NavGroup { label: string; items: NavItem[] }

const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Cadastros',
    items: [
      { href: '/imoveis',  label: 'Imóveis',  icon: Home,      adminOnly: false },
      { href: '/clientes', label: 'Clientes', icon: UserRound, adminOnly: false },
    ],
  },
  {
    label: 'Operações',
    items: [
      { href: '/matches', label: 'Matches', icon: GitMerge,      adminOnly: false },
      { href: '/agenda',  label: 'Agenda',  icon: CalendarDays,  adminOnly: false },
      { href: '/aluguel', label: 'Aluguel', icon: KeyRound,      adminOnly: true  },
      { href: '/chats',   label: 'Chats',   icon: MessageSquare, adminOnly: true  },
    ],
  },
  {
    label: 'Financeiro',
    items: [
      { href: '/financeiro', label: 'Contas a Receber', icon: DollarSign, adminOnly: true },
    ],
  },
  {
    label: 'Análise',
    items: [
      { href: '/relatorios', label: 'Relatórios', icon: BarChart2, adminOnly: true },
    ],
  },
  {
    label: 'Sistema',
    items: [
      { href: '/settings/pipeline', label: 'Configurações', icon: Settings2, adminOnly: true },
    ],
  },
]

interface SidebarProps {
  mobileOpen: boolean
  onMobileClose: () => void
}

export function Sidebar({ mobileOpen, onMobileClose }: SidebarProps) {
  const pathname = usePathname()
  const router   = useRouter()
  const [user,      setUser]      = useState<UserInfo | null>(null)
  const [collapsed, setCollapsed] = useState(false)

  const dashboardHref = user?.role === 'CORRETOR' ? '/corretor' : '/dashboard'

  const DASHBOARD_ITEM: NavItem = { href: dashboardHref, label: 'Dashboard', icon: LayoutDashboard, adminOnly: false }

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem('user')
      if (stored) setUser(JSON.parse(stored))
    } catch {}
    const saved = localStorage.getItem('sidebar-collapsed')
    if (saved === 'true') setCollapsed(true)
  }, [])

  // Fecha drawer ao navegar
  useEffect(() => { onMobileClose() }, [pathname]) // eslint-disable-line react-hooks/exhaustive-deps

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

  function NavLink({ item, drawer = false }: { item: NavItem; drawer?: boolean }) {
    const isDash = item.href === '/dashboard' || item.href === '/corretor'
    const isActive = isDash
      ? pathname === '/dashboard' || pathname === '/corretor'
      : pathname.startsWith(item.href)
    return (
      <Link
        href={item.href}
        title={!drawer && collapsed ? item.label : undefined}
        className={cn(
          'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
          !drawer && collapsed && 'justify-center px-2',
          isActive ? 'bg-blue-500/15 text-blue-400' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200',
        )}
      >
        <item.icon className={cn('h-[18px] w-[18px] shrink-0', isActive && 'text-blue-400')} />
        {(drawer || !collapsed) && (
          <>
            {item.label}
            {isActive && <span className="ml-auto w-1 h-4 rounded-full bg-blue-400" />}
          </>
        )}
      </Link>
    )
  }

  function NavLinks({ drawer = false }: { drawer?: boolean }) {
    return (
      <nav className="flex-1 px-2 py-4 overflow-y-auto">
        {/* Dashboard — sempre no topo, sem grupo */}
        <NavLink item={DASHBOARD_ITEM} drawer={drawer} />

        {NAV_GROUPS.map((group) => {
          const visibleItems = group.items.filter((item) => !item.adminOnly || user?.role === 'ADMIN')
          if (visibleItems.length === 0) return null
          return (
            <div key={group.label} className="mt-4">
              {(drawer || !collapsed) && (
                <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                  {group.label}
                </p>
              )}
              {collapsed && !drawer && <div className="mx-3 my-2 border-t border-white/10" />}
              <div className="space-y-0.5">
                {visibleItems.map((item) => (
                  <NavLink key={item.href} item={item} drawer={drawer} />
                ))}
              </div>
            </div>
          )
        })}
      </nav>
    )
  }

  function UserFooter({ drawer = false }: { drawer?: boolean }) {
    return (
      <div className="px-2 py-4 border-t border-white/10 space-y-1">
        {user && (
          <div
            className={cn('flex items-center gap-3 px-3 py-2.5 rounded-lg bg-white/5 mb-1', !drawer && collapsed && 'justify-center px-2')}
            title={!drawer && collapsed ? `${user.name} (${user.role})` : undefined}
          >
            <div className="h-8 w-8 rounded-full bg-blue-500/30 flex items-center justify-center shrink-0">
              <span className="text-xs font-bold text-blue-300">{initials(user.name)}</span>
            </div>
            {(drawer || !collapsed) && (
              <div className="min-w-0 flex-1 overflow-hidden">
                <p className="text-sm font-medium text-slate-200 truncate">{user.name}</p>
                <p className="text-[11px] text-slate-500 truncate">{user.email}</p>
              </div>
            )}
            {(drawer || !collapsed) && user.role === 'ADMIN' && (
              <span className="shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400">Admin</span>
            )}
          </div>
        )}
        <button
          onClick={handleLogout}
          title={!drawer && collapsed ? 'Sair' : undefined}
          className={cn('flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:bg-white/5 hover:text-slate-200 transition-all duration-150', !drawer && collapsed && 'justify-center px-2')}
        >
          <LogOut className="h-[18px] w-[18px] shrink-0" />
          {(drawer || !collapsed) && 'Sair'}
        </button>
      </div>
    )
  }

  return (
    <>
      {/* ── Mobile drawer overlay ── */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden" onClick={onMobileClose}>
          <div className="absolute inset-0 bg-black/50" />
          <aside
            className="absolute left-0 top-0 h-full w-64 flex flex-col"
            style={{ background: '#0F172A' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Logo + fechar */}
            <div className="px-3 py-4 border-b border-white/10 flex items-center justify-between min-h-[57px]">
              <Link href="/dashboard" className="flex items-center gap-2.5 min-w-0" onClick={onMobileClose}>
                <div className="p-1.5 rounded-lg bg-blue-500/20 shrink-0">
                  <Building2 className="h-4 w-4 text-blue-400" />
                </div>
                <div className="min-w-0">
                  <span className="text-sm font-semibold text-white tracking-tight leading-tight whitespace-nowrap">
                    Imov<span className="text-blue-400 font-bold">IA</span>
                  </span>
                  {user?.tenantName && (
                    <p className="text-[13px] text-slate-400 truncate leading-tight">{user.tenantName}</p>
                  )}
                </div>
              </Link>
              <button onClick={onMobileClose} className="flex items-center justify-center h-7 w-7 rounded-md text-slate-400 hover:text-white hover:bg-white/10 transition-all">
                <X className="h-4 w-4" />
              </button>
            </div>
            <NavLinks drawer />
            <UserFooter drawer />
          </aside>
        </div>
      )}

      {/* ── Desktop sidebar ── */}
      <aside
        className={cn(
          'hidden md:flex flex-col h-screen sticky top-0 shrink-0 transition-all duration-300 ease-in-out overflow-hidden',
          collapsed ? 'w-16' : 'w-60',
        )}
        style={{ background: '#0F172A' }}
      >
        {/* Logo + toggle */}
        <div className="px-3 py-4 border-b border-white/10 flex items-center justify-between min-h-[57px]">
          <Link
            href="/dashboard"
            className={cn('flex items-center gap-2.5 group transition-all duration-200 overflow-hidden min-w-0', collapsed ? 'w-0 opacity-0 pointer-events-none' : 'w-auto opacity-100')}
          >
            <div className="p-1.5 rounded-lg bg-blue-500/20 shrink-0">
              <Building2 className="h-4 w-4 text-blue-400" />
            </div>
            <div className="min-w-0">
              <span className="text-sm font-semibold text-white tracking-tight leading-tight whitespace-nowrap">
                Imov<span className="text-blue-400 font-bold">IA</span>
              </span>
              {user?.tenantName && (
                <p className="text-[13px] text-slate-400 truncate leading-tight">{user.tenantName}</p>
              )}
            </div>
          </Link>
          {collapsed && (
            <Link href="/dashboard" className="mx-auto">
              <div className="p-1.5 rounded-lg bg-blue-500/20">
                <Building2 className="h-4 w-4 text-blue-400" />
              </div>
            </Link>
          )}
          <button
            onClick={toggleCollapsed}
            title={collapsed ? 'Expandir menu' : 'Recolher menu'}
            className={cn('flex items-center justify-center h-6 w-6 rounded-md text-slate-400 hover:text-white hover:bg-white/10 transition-all duration-150 shrink-0', collapsed && 'hidden')}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        </div>
        {collapsed && (
          <button onClick={toggleCollapsed} title="Expandir menu" className="mx-auto mt-3 flex items-center justify-center h-7 w-7 rounded-md text-slate-400 hover:text-white hover:bg-white/10 transition-all duration-150">
            <ChevronRight className="h-4 w-4" />
          </button>
        )}
        <NavLinks />
        <UserFooter />
      </aside>
    </>
  )
}
