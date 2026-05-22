import { Sidebar } from '@/components/layout/sidebar'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-[#F1F5F9]">
      <Sidebar />
      <main className="flex-1 p-8 overflow-auto min-w-0">{children}</main>
    </div>
  )
}
