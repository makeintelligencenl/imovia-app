'use client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Building2, LayoutDashboard, Users, LogOut } from 'lucide-react'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()

  async function handleLogout() {
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      })
    } finally {
      sessionStorage.removeItem('user')
      sessionStorage.removeItem('auth_token')
      router.push('/login')
    }
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <aside className="w-60 border-r bg-white flex flex-col h-screen sticky top-0">
        <div className="p-6 border-b">
          <Link href="/admin" className="flex items-center gap-2 font-bold text-primary">
            <Building2 className="h-5 w-5" />
            Admin
          </Link>
          <p className="text-xs text-muted-foreground mt-1">Super administrador</p>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {[
            { href: '/admin', label: 'Visão geral', icon: LayoutDashboard },
            { href: '/admin/tenants', label: 'Imobiliárias', icon: Users },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="p-4 border-t">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm font-medium text-gray-500 hover:bg-gray-100 hover:text-red-600 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Sair
          </button>
        </div>
      </aside>
      <main className="flex-1 p-8">{children}</main>
    </div>
  )
}
