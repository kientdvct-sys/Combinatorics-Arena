import type { CSSProperties, ReactNode } from 'react'
import { Hexagon, Timer } from 'lucide-react'

export function Brand({ small = false }: { small?: boolean }) {
  return <a href="#/" className={'brand' + (small ? ' brand-small' : '')}>
    <span className="brand-symbol"><Hexagon size={24} strokeWidth={1.4} /><i /></span>
    <span>COMBINATORICS <b>ARENA</b></span>
  </a>
}

export const accentStyle = (color: string) => ({ '--accent': color }) as CSSProperties

export function formatTime(elapsed: number) {
  const seconds = Math.floor(elapsed / 1000)
  return Math.floor(seconds / 60).toString().padStart(2, '0') + ':' + (seconds % 60).toString().padStart(2, '0')
}

export function Time({ elapsed }: { elapsed: number }) {
  return <span className="inline-flex items-center gap-2"><Timer size={15} /> {formatTime(elapsed)}</span>
}

export function PageTitle({ overline, title, children }: { overline: string; title: string; children?: ReactNode }) {
  return <div className="page-title">
    <p className="eyebrow">{overline}</p>
    <h1>{title}</h1>
    {children && <p className="muted">{children}</p>}
  </div>
}
