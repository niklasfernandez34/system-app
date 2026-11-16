import { getStroke } from 'perfect-freehand'
import type { Stroke } from '../db/db'

export const PAGE_W = 1000
export const PAGE_H = 1414

const avg = (a: number, b: number) => (a + b) / 2

function svgPath(points: number[][]) {
  const len = points.length
  if (len < 4) return ''
  let a = points[0]
  let b = points[1]
  const c = points[2]
  let d = `M${a[0].toFixed(1)},${a[1].toFixed(1)} Q${b[0].toFixed(1)},${b[1].toFixed(1)} ${avg(b[0], c[0]).toFixed(1)},${avg(b[1], c[1]).toFixed(1)} T`
  for (let i = 2; i < len - 1; i++) {
    a = points[i]
    b = points[i + 1]
    d += `${avg(a[0], b[0]).toFixed(1)},${avg(a[1], b[1]).toFixed(1)} `
  }
  return d + 'Z'
}

export function strokePath(s: Stroke, done = true) {
  const pen = s.tool === 'pen'
  const pressure = s.points.some((p) => p[2] !== 0.5)
  return svgPath(
    getStroke(s.points, {
      size: s.size,
      thinning: pen ? 0.6 : 0,
      smoothing: 0.5,
      streamline: 0.45,
      simulatePressure: pen && !pressure,
      last: done,
      start: { cap: true },
      end: { cap: true },
    }),
  )
}

export function hitStroke(s: Stroke, x: number, y: number, r: number) {
  const reach = r + s.size / 2
  for (let i = 0; i < s.points.length; i++) {
    const [px, py] = s.points[i]
    if ((px - x) ** 2 + (py - y) ** 2 <= reach ** 2) return true
    const next = s.points[i + 1]
    if (!next) continue
    const [qx, qy] = next
    const dx = qx - px
    const dy = qy - py
    const l2 = dx * dx + dy * dy
    if (!l2) continue
    const t = Math.max(0, Math.min(1, ((x - px) * dx + (y - py) * dy) / l2))
    if ((px + t * dx - x) ** 2 + (py + t * dy - y) ** 2 <= reach ** 2) return true
  }
  return false
}

export const isEmpty = (pages: Stroke[][]) => pages.every((p) => p.length === 0)
