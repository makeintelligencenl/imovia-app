import Link from 'next/link'
import { Building2, LayoutDashboard, Users } from 'lucide-react'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
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
      </aside>
      <main className="flex-1 p-8">{children}</main>
    </div>
  )
}
