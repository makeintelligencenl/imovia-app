'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Settings2, Users, DollarSign } from 'lucide-react'
import { cn } from '@/lib/utils'
import { MobileBlock } from '@/components/layout/mobile-block'

const TABS = [
  { href: '/dashboard/settings/pipeline',   label: 'Funil de Vendas', icon: Settings2  },
  { href: '/dashboard/settings/usuarios',   label: 'Usuários',        icon: Users      },
  { href: '/dashboard/settings/financeiro', label: 'Financeiro',      icon: DollarSign },
]

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <MobileBlock>
    <div className="space-y-6">
      {/* ── Cabeçalho ── */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Configurações</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Gerencie o pipeline e os usuários da sua imobiliária
        </p>
      </div>

      {/* ── Abas ── */}
      <div className="flex gap-1 border-b border-border">
        {TABS.map((tab) => {
          const isActive = pathname.startsWith(tab.href)
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                'flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors',
                isActive
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-slate-300',
              )}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </Link>
          )
        })}
      </div>

      {/* ── Conteúdo da aba ── */}
      {children}
    </div>
    </MobileBlock>
  )
}
