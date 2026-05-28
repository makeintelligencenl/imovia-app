import { Sidebar } from '@/components/layout/sidebar'
import { SessionGuard } from '@/components/layout/session-guard'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <SessionGuard>
      <div className="flex min-h-screen bg-[#F1F5F9]">
        <Sidebar />
        <main className="flex-1 p-8 overflow-auto min-w-0">{children}</main>
      </div>
    </SessionGuard>
  )
}
