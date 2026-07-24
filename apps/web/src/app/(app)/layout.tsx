'use client'
import { useState } from 'react'
import Link from 'next/link'
import { Menu, Building2 } from 'lucide-react'
import { Sidebar } from '@/components/layout/sidebar'
import { MobileBottomNav } from '@/components/layout/mobile-bottom-nav'
import { SessionGuard } from '@/components/layout/session-guard'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <SessionGuard>
      <div className="flex min-h-screen bg-[#F1F5F9]">
        <Sidebar mobileOpen={mobileOpen} onMobileClose={() => setMobileOpen(false)} />

        <div className="flex-1 flex flex-col min-w-0">
          {/* ── Topbar mobile (só aparece em telas < md) ── */}
          <header
            className="md:hidden flex items-center justify-between px-4 py-3 sticky top-0 z-30 shrink-0"
            style={{ background: '#0F172A' }}
          >
            <Link href="/dashboard" className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-blue-500/20">
                <Building2 className="h-4 w-4 text-blue-400" />
              </div>
              <span className="font-bold text-white text-sm">
                Imov<span className="text-blue-400">IA</span>
              </span>
            </Link>
            <button
              onClick={() => setMobileOpen(true)}
              aria-label="Abrir menu"
              className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <Menu className="h-5 w-5" />
            </button>
          </header>

          {/* ── Conteúdo principal ── */}
          {/* pb-20 no mobile reserva espaço para o bottom nav fixo */}
          <main className="flex-1 p-4 md:p-8 pb-24 md:pb-8 overflow-auto min-w-0">
            {children}
          </main>
        </div>

        {/* ── Bottom nav mobile ── */}
        <MobileBottomNav onMoreClick={() => setMobileOpen(true)} />
      </div>
    </SessionGuard>
  )
}
