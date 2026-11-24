import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { ReactNode } from 'react'

export function Pagination({ page, pageCount, select, label = 'Phân trang', children }: {
  page: number; pageCount: number; select: (page: number) => void; label?: string; children?: ReactNode
}) {
  if (pageCount <= 1) return null
  return <div className="pagination" role="group" aria-label={label}>
    <span>{children ?? ('Trang ' + (page + 1) + ' / ' + pageCount)}</span>
    <button type="button" className="icon-btn" onClick={() => select(page - 1)} disabled={page === 0} aria-label="Trang trước"><ChevronLeft size={18} /></button>
    <button type="button" className="icon-btn" onClick={() => select(page + 1)} disabled={page + 1 === pageCount} aria-label="Trang sau"><ChevronRight size={18} /></button>
  </div>
}
