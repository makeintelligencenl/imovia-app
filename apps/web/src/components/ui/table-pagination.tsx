'use client'
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select'
import { Button } from './button'

interface TablePaginationProps {
  total: number        // total de itens filtrados
  page: number         // página atual (1-based)
  pageSize: number     // itens por página
  onPageChange: (page: number) => void
  onPageSizeChange: (size: number) => void
}

const PAGE_SIZES = [10, 20, 50, 100]

export function TablePagination({
  total,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
}: TablePaginationProps) {
  const totalPages  = Math.max(1, Math.ceil(total / pageSize))
  const firstItem   = total === 0 ? 0 : (page - 1) * pageSize + 1
  const lastItem    = Math.min(page * pageSize, total)

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-slate-50/60 rounded-b-xl">
      {/* Itens por página */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground whitespace-nowrap">Itens por página</span>
        <Select
          value={String(pageSize)}
          onValueChange={(v) => { onPageSizeChange(Number(v)); onPageChange(1) }}
        >
          <SelectTrigger className="h-7 w-20 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PAGE_SIZES.map((s) => (
              <SelectItem key={s} value={String(s)} className="text-xs">{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Contagem central */}
      <span className="text-xs text-muted-foreground hidden sm:block">
        {total === 0 ? 'Nenhum item' : `${firstItem}–${lastItem} de ${total}`}
      </span>

      {/* Navegação */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost" size="icon"
          className="h-7 w-7"
          onClick={() => onPageChange(1)}
          disabled={page === 1}
          title="Primeira página"
        >
          <ChevronsLeft className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost" size="icon"
          className="h-7 w-7"
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1}
          title="Página anterior"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </Button>

        <span className="text-xs font-medium px-2 tabular-nums">
          {page} / {totalPages}
        </span>

        <Button
          variant="ghost" size="icon"
          className="h-7 w-7"
          onClick={() => onPageChange(page + 1)}
          disabled={page === totalPages}
          title="Próxima página"
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost" size="icon"
          className="h-7 w-7"
          onClick={() => onPageChange(totalPages)}
          disabled={page === totalPages}
          title="Última página"
        >
          <ChevronsRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  )
}
