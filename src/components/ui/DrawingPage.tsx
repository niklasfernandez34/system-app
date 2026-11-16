import { memo } from 'react'
import type { Paper, Stroke } from '../../db/db'
import { PAGE_H, PAGE_W, strokePath } from '../../lib/drawing'

export const PAPER_BG = '#0a1424'
const LINE = '#1e4a7a'

export function PaperLines({ paper }: { paper: Paper }) {
  if (paper === 'blank') return null
  const out = []
  if (paper === 'lined') {
    for (let y = 140; y < PAGE_H - 40; y += 56) out.push(<line key={y} x1={40} x2={PAGE_W - 40} y1={y} y2={y} stroke={LINE} strokeWidth={1.5} />)
  } else {
    for (let y = 50; y < PAGE_H; y += 50) out.push(<line key={`h${y}`} x1={0} x2={PAGE_W} y1={y} y2={y} stroke={LINE} strokeWidth={1} opacity={0.7} />)
    for (let x = 50; x < PAGE_W; x += 50) out.push(<line key={`v${x}`} x1={x} x2={x} y1={0} y2={PAGE_H} stroke={LINE} strokeWidth={1} opacity={0.7} />)
  }
  return <g>{out}</g>
}

export function StrokePath({ stroke, done = true }: { stroke: Stroke; done?: boolean }) {
  return <path d={strokePath(stroke, done)} fill={stroke.color} opacity={stroke.tool === 'marker' ? 0.35 : 1} />
}

export const PageStrokes = memo(function PageStrokes({ strokes }: { strokes: Stroke[] }) {
  return (
    <g>
      {strokes.map((s, i) => (
        <StrokePath key={i} stroke={s} />
      ))}
    </g>
  )
})
