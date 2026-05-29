'use client'
import { cn } from '@/lib/utils'

interface LeadScoreProps {
  score: number
  size?: 'sm' | 'md' | 'lg'
  showBar?: boolean
  className?: string
}

function scoreColor(score: number) {
  if (score >= 80) return { ring: 'ring-emerald-300', text: 'text-emerald-700', bg: 'bg-emerald-50',  bar: 'bg-emerald-500', label: 'Quente'  }
  if (score >= 65) return { ring: 'ring-blue-300',    text: 'text-blue-700',    bg: 'bg-blue-50',     bar: 'bg-blue-500',    label: 'Morno'   }
  if (score >= 55) return { ring: 'ring-amber-300',   text: 'text-amber-700',   bg: 'bg-amber-50',    bar: 'bg-amber-400',   label: 'Frio'    }
  return               { ring: 'ring-slate-200',    text: 'text-slate-500',   bg: 'bg-slate-50',    bar: 'bg-slate-300',   label: 'Novo'    }
}

export function LeadScore({ score, size = 'md', showBar = true, className }: LeadScoreProps) {
  const c = scoreColor(score)
  const pct = score // já é 0-100

  if (size === 'sm') {
    return (
      <span
        title={`Lead Score: ${score}% — ${c.label}`}
        className={cn(
          'inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full ring-1',
          c.bg, c.text, c.ring, className,
        )}
      >
        {score}%
      </span>
    )
  }

  if (size === 'lg') {
    return (
      <div className={cn('flex flex-col items-end gap-1', className)}>
        <div className="flex items-center gap-2">
          <span className={cn('text-2xl font-extrabold tabular-nums', c.text)}>{score}%</span>
          <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full ring-1', c.bg, c.text, c.ring)}>
            {c.label}
          </span>
        </div>
        {showBar && (
          <div className="w-32 h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={cn('h-full rounded-full transition-all duration-500', c.bar)}
              style={{ width: `${pct}%` }}
            />
          </div>
        )}
        <span className="text-[10px] text-muted-foreground">Lead Score</span>
      </div>
    )
  }

  // md (padrão)
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className="flex flex-col gap-0.5 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className={cn('text-sm font-bold tabular-nums', c.text)}>{score}%</span>
          <span className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded-full ring-1', c.bg, c.text, c.ring)}>
            {c.label}
          </span>
        </div>
        {showBar && (
          <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={cn('h-full rounded-full transition-all duration-500', c.bar)}
              style={{ width: `${pct}%` }}
            />
          </div>
        )}
      </div>
    </div>
  )
}
