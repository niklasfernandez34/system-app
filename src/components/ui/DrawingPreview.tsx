import type { Paper, Stroke } from '../../db/db'
import { PAGE_H, PAGE_W } from '../../lib/drawing'
import { useDrawing } from '../../lib/drawings'
import { PAPER_BG, PageStrokes, PaperLines } from './DrawingPage'

type Props = { id: number; allPages?: boolean; onClick?: () => void; className?: string }

export function DrawingPreview({ id, allPages = false, onClick, className = '' }: Props) {
  const drawing = useDrawing(id)
  if (!drawing) return null
  const pages = allPages ? drawing.pages : drawing.pages.slice(0, 1)
  const body = (
    <span className="block space-y-2">
      {pages.map((p, i) => (
        <PageSvg key={i} strokes={p} paper={drawing.paper} />
      ))}
    </span>
  )
  if (!onClick) return <div className={className}>{body}</div>
  return (
    <button type="button" onClick={onClick} className={`relative block w-full text-left ${className}`}>
      {body}
      {!allPages && drawing.pages.length > 1 && (
        <span className="absolute bottom-1 right-1 rounded bg-sys-bg/80 px-1 text-[10px] text-sys-muted">{drawing.pages.length} S.</span>
      )}
    </button>
  )
}

function PageSvg({ strokes, paper }: { strokes: Stroke[]; paper: Paper }) {
  return (
    <svg viewBox={`0 0 ${PAGE_W} ${PAGE_H}`} className="block w-full rounded border border-sys-line" style={{ background: PAPER_BG }}>
      <PaperLines paper={paper} />
      <PageStrokes strokes={strokes} />
    </svg>
  )
}
