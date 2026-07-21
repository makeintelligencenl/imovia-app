'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Home, GitMerge, CalendarDays, MoreHorizontal } from 'lucide-react'
import { cn } from '@/lib/utils'

const ITEMS = [
  { href: '/dashboard',          label: 'Início',   icon: LayoutDashboard, exact: true },
  { href: '/dashboard/imoveis',  label: 'Imóveis',  icon: Home,            exact: false },
  { href: '/dashboard/matches',  label: 'Matches',  icon: GitMerge,        exact: false },
  { href: '/dashboard/agenda',   label: 'Agenda',   icon: CalendarDays,    exact: false },
]

interface Props { onMoreClick: () => void }

export function MobileBottomNav({ onMoreClick }: Props) {
  const pathname = usePathname()

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-30 flex items-center justify-around px-1"
      style={{
        background: '#0F172A',
        borderTop: '1px solid #1e293b',
        paddingBottom: 'max(12px, env(safe-area-inset-bottom))',
        paddingTop: '8px',
      }}
    >
      {ITEMS.map((item) => {
        const isActive = item.exact
          ? pathname === item.href || pathname === '/dashboard/corretor'
          : pathname.startsWith(item.href)
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex flex-col items-center gap-1 px-3 py-1 rounded-lg transition-colors',
              isActive ? 'text-blue-400' : 'text-slate-500',
            )}
          >
            <item.icon className="h-5 w-5" />
            <span className="text-[10px] font-medium">{item.label}</span>
          </Link>
        )
      })}
      <button
        onClick={onMoreClick}
        className="flex flex-col items-center gap-1 px-3 py-1 rounded-lg text-slate-500"
      >
        <MoreHorizontal className="h-5 w-5" />
        <span className="text-[10px] font-medium">Mais</span>
      </button>
    </nav>
  )
}
