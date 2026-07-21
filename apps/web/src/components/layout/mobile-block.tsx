'use client'
import { useEffect, useState } from 'react'
import { Monitor } from 'lucide-react'

export function MobileBlock({ children }: { children: React.ReactNode }) {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  if (isMobile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6 gap-4">
        <div className="p-4 rounded-2xl bg-slate-100">
          <Monitor className="h-10 w-10 text-slate-400" />
        </div>
        <div>
          <p className="font-semibold text-slate-700">Disponível apenas no desktop</p>
          <p className="text-sm text-slate-400 mt-1">
            Acesse pelo computador para usar esta funcionalidade.
          </p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
