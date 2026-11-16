import { useCallback, useEffect, useRef, useState, type PointerEvent as RPointerEvent } from 'react'
import { db, type Paper, type Stroke, type StrokePoint } from '../../db/db'
import { hitStroke, PAGE_H, PAGE_W, strokePath } from '../../lib/drawing'
import { saveDrawing } from '../../lib/drawings'
import { PAPER_BG, PageStrokes, PaperLines } from './DrawingPage'

type Tool = 'pen' | 'marker' | 'eraser'
const COLORS = ['#dbeafe', '#38bdf8', '#f43f5e', '#4ade80', '#facc15']
const SIZES = { pen: [3, 6, 12], marker: [18, 30, 45], eraser: [10, 25, 50] } as const
const PAPERS: { id: Paper; label: string }[] = [
  { id: 'lined', label: 'Liniert' },
  { id: 'grid', label: 'Kariert' },
  { id: 'blank', label: 'Leer' },
]

const capture = (e: RPointerEvent<SVGSVGElement>) => {
  try {
    e.currentTarget.setPointerCapture(e.pointerId)
  } catch {
    return
  }
}

const PEN_KEY = 'system-pen-seen'
const readPen = () => {
  try {
    return localStorage.getItem(PEN_KEY) === '1'
  } catch {
    return false
  }
}
const rememberPen = () => {
  try {
    localStorage.setItem(PEN_KEY, '1')
  } catch {
    return
  }
}

type Current = { page: number; pointerId: number; pen: boolean; stroke: Stroke } | null
type Props = { id: number | null; onClose: () => void }

export function DrawingEditor({ id, onClose }: Props) {
  const ref = useRef<HTMLDialogElement>(null)
  const scroller = useRef<HTMLDivElement>(null)
  const live = useRef<(SVGPathElement | null)[]>([])
  const raf = useRef(0)
  const hooked = useRef(new WeakSet<SVGSVGElement>())
  const [pages, setPages] = useState<Stroke[][] | null>(null)
  const [paper, setPaper] = useState<Paper>('lined')
  const [tool, setTool] = useState<Tool>('pen')
  const [color, setColor] = useState(COLORS[0])
  const [sizeIdx, setSizeIdx] = useState(1)
  const [penSeen, setPenSeen] = useState(readPen)
  const [fingerDraw, setFingerDraw] = useState(true)
  const [undo, setUndo] = useState<Stroke[][][]>([])
  const [redo, setRedo] = useState<Stroke[][][]>([])
  const cur = useRef<Current>(null)
  const erase = useRef<{ pointerId: number; page: number; snap: Stroke[][] } | null>(null)
  const mode = useRef({ penSeen, fingerDraw: true })
  const pagesRef = useRef<Stroke[][] | null>(null)
  const dirty = useRef(false)
  pagesRef.current = pages
  mode.current = { penSeen, fingerDraw }

  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (id && !d.open) d.showModal()
    if (!id && d.open) d.close()
    if (!id) return
    setPages(null)
    setUndo([])
    setRedo([])
    db.drawings.get(id).then((r) => {
      setPages(r?.pages.length ? r.pages : [[]])
      setPaper(r?.paper ?? 'lined')
      dirty.current = false
    })
  }, [id])

  const flush = useCallback(async () => {
    if (!id || !pagesRef.current || !dirty.current) return
    dirty.current = false
    await saveDrawing(id, pagesRef.current, paper)
  }, [id, paper])

  useEffect(() => {
    if (!dirty.current) return
    const t = setTimeout(flush, 600)
    return () => clearTimeout(t)
  }, [pages, paper, flush])

  const change = (next: Stroke[][], snap: Stroke[][]) => {
    dirty.current = true
    setUndo((u) => [...u.slice(-99), snap])
    setRedo([])
    setPages(next)
  }

  const close = async () => {
    await flush()
    onClose()
  }

  const point = (e: PointerEvent, svg: SVGSVGElement): StrokePoint => {
    const r = svg.getBoundingClientRect()
    const p = e.pointerType === 'pen' ? e.pressure || 0.5 : 0.5
    return [((e.clientX - r.left) / r.width) * PAGE_W, ((e.clientY - r.top) / r.height) * PAGE_H, p]
  }

  const eraseAt = (page: number, [x, y]: StrokePoint) => {
    const all = pagesRef.current
    if (!all) return
    const left = all[page].filter((s) => !hitStroke(s, x, y, SIZES.eraser[sizeIdx]))
    if (left.length === all[page].length) return
    const next = all.map((p, i) => (i === page ? left : p))
    pagesRef.current = next
    setPages(next)
  }

  const paint = () => {
    if (raf.current) return
    raf.current = requestAnimationFrame(() => {
      raf.current = 0
      const c = cur.current
      live.current.forEach((el, i) => {
        if (!el) return
        if (!c || c.page !== i) return el.setAttribute('d', '')
        el.setAttribute('d', strokePath(c.stroke, false))
        el.setAttribute('fill', c.stroke.color)
        el.setAttribute('opacity', c.stroke.tool === 'marker' ? '0.35' : '1')
      })
    })
  }

  const hook = (svg: SVGSVGElement | null) => {
    if (!svg || hooked.current.has(svg)) return
    hooked.current.add(svg)
    const block = (e: TouchEvent) => {
      const touches = [...Array.from(e.touches), ...Array.from(e.changedTouches)]
      const stylus = touches.some((t) => (t as Touch & { touchType?: string }).touchType === 'stylus')
      if (stylus || cur.current?.pen || (!mode.current.penSeen && mode.current.fingerDraw)) e.preventDefault()
    }
    svg.addEventListener('touchstart', block, { passive: false })
    svg.addEventListener('touchmove', block, { passive: false })
  }

  const down = (e: RPointerEvent<SVGSVGElement>, page: number) => {
    const pen = e.pointerType === 'pen'
    if (pen && !penSeen) {
      setPenSeen(true)
      rememberPen()
    }
    if (!pen && e.pointerType === 'touch' && (penSeen || !fingerDraw)) return
    if (erase.current) return
    if (cur.current) {
      if (!pen || cur.current.pen) return
      cur.current = null
    }
    e.preventDefault()
    capture(e)
    const pt = point(e.nativeEvent, e.currentTarget)
    if (tool === 'eraser') {
      erase.current = { pointerId: e.pointerId, page, snap: pagesRef.current! }
      eraseAt(page, pt)
      return
    }
    cur.current = { page, pointerId: e.pointerId, pen, stroke: { tool, color, size: SIZES[tool][sizeIdx], points: [pt] } }
    paint()
  }

  const move = (e: RPointerEvent<SVGSVGElement>) => {
    const co = e.nativeEvent.getCoalescedEvents?.()
    const events = co?.length ? co : [e.nativeEvent]
    const er = erase.current
    if (er && er.pointerId === e.pointerId) {
      for (const ev of events) eraseAt(er.page, point(ev, e.currentTarget))
      return
    }
    const c = cur.current
    if (!c || c.pointerId !== e.pointerId) return
    for (const ev of events) c.stroke.points.push(point(ev, e.currentTarget))
    paint()
  }

  const up = (e: RPointerEvent<SVGSVGElement>) => {
    const er = erase.current
    if (er && er.pointerId === e.pointerId) {
      erase.current = null
      if (pagesRef.current !== er.snap) change(pagesRef.current!, er.snap)
      return
    }
    const c = cur.current
    if (!c || c.pointerId !== e.pointerId) return
    cur.current = null
    if (e.type === 'pointercancel' && c.stroke.points.length < 3) return paint()
    const all = pagesRef.current!
    change(
      all.map((p, i) => (i === c.page ? [...p, c.stroke] : p)),
      all,
    )
    paint()
  }

  const doUndo = () => {
    const prev = undo[undo.length - 1]
    if (!prev || !pages) return
    dirty.current = true
    setRedo((r) => [...r, pages])
    setUndo((u) => u.slice(0, -1))
    setPages(prev)
  }

  const doRedo = () => {
    const next = redo[redo.length - 1]
    if (!next || !pages) return
    dirty.current = true
    setUndo((u) => [...u, pages])
    setRedo((r) => r.slice(0, -1))
    setPages(next)
  }

  const setPaperAndSave = (p: Paper) => {
    dirty.current = true
    setPaper(p)
  }

  const drawTouch = !penSeen && fingerDraw
  const seg = (active: boolean) =>
    `min-h-9 rounded-md border px-2 text-sm ${active ? 'border-sys-glow bg-sys-glow/15 text-sys-text shadow-glow' : 'border-sys-line text-sys-muted'}`

  return (
    <dialog
      ref={ref}
      onCancel={(e) => {
        e.preventDefault()
        close()
      }}
      className="m-0 h-[100dvh] max-h-none w-screen max-w-none bg-sys-bg p-0 text-sys-text"
    >
      <div className="flex h-full flex-col">
        <div className="pt-safe px-safe border-b border-sys-line bg-sys-panel/95">
          <div className="mx-auto flex max-w-4xl flex-wrap items-center gap-2 p-2">
            <button type="button" className={seg(true)} onClick={close}>
              Fertig
            </button>
            <div className="flex gap-1">
              <button type="button" className={seg(tool === 'pen')} onClick={() => setTool('pen')}>
                ✎ Stift
              </button>
              <button type="button" className={seg(tool === 'marker')} onClick={() => setTool('marker')}>
                ▬ Marker
              </button>
              <button type="button" className={seg(tool === 'eraser')} onClick={() => setTool('eraser')}>
                ⌫ Radierer
              </button>
            </div>
            <div className="flex gap-1">
              <button type="button" aria-label="Rückgängig" className={seg(false)} disabled={!undo.length} onClick={doUndo}>
                ↶
              </button>
              <button type="button" aria-label="Wiederholen" className={seg(false)} disabled={!redo.length} onClick={doRedo}>
                ↷
              </button>
            </div>
            <div className="flex items-center gap-1.5">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-label={`Farbe ${c}`}
                  onClick={() => {
                    setColor(c)
                    if (tool === 'eraser') setTool('pen')
                  }}
                  className={`h-7 w-7 rounded-full border-2 ${color === c && tool !== 'eraser' ? 'border-sys-text' : 'border-transparent'}`}
                  style={{ background: c }}
                />
              ))}
            </div>
            <div className="flex items-center gap-1">
              {[0, 1, 2].map((i) => (
                <button key={i} type="button" aria-label={`Stärke ${i + 1}`} className={`${seg(sizeIdx === i)} w-9`} onClick={() => setSizeIdx(i)}>
                  <span className="mx-auto block rounded-full bg-current" style={{ width: 4 + i * 5, height: 4 + i * 5 }} />
                </button>
              ))}
            </div>
            <div className="flex gap-1">
              {PAPERS.map((p) => (
                <button key={p.id} type="button" className={seg(paper === p.id)} onClick={() => setPaperAndSave(p.id)}>
                  {p.label}
                </button>
              ))}
            </div>
            {!penSeen && (
              <button type="button" className={seg(false)} onClick={() => setFingerDraw(!fingerDraw)}>
                Finger: {fingerDraw ? 'Zeichnen' : 'Scrollen'}
              </button>
            )}
          </div>
        </div>

        <div ref={scroller} className="px-safe pb-safe flex-1 overflow-y-auto">
          <div className="mx-auto max-w-4xl space-y-4 p-3">
            {pages?.map((strokes, i) => (
              <div key={i}>
                <svg
                  ref={hook}
                  viewBox={`0 0 ${PAGE_W} ${PAGE_H}`}
                  className="block w-full select-none rounded border border-sys-line"
                  style={{ background: PAPER_BG, touchAction: drawTouch ? 'none' : 'pan-y', WebkitTouchCallout: 'none', WebkitUserSelect: 'none' }}
                  onPointerDown={(e) => down(e, i)}
                  onPointerMove={move}
                  onPointerUp={up}
                  onPointerCancel={up}
                >
                  <PaperLines paper={paper} />
                  <PageStrokes strokes={strokes} />
                  <path
                    ref={(el) => {
                      live.current[i] = el
                    }}
                  />
                </svg>
                <div className="mt-1 flex justify-between text-xs text-sys-muted">
                  <span>
                    Seite {i + 1} / {pages.length}
                  </span>
                  {pages.length > 1 && (
                    <button type="button" className="underline" onClick={() => change(pages.filter((_, j) => j !== i), pages)}>
                      Seite löschen
                    </button>
                  )}
                </div>
              </div>
            ))}
            {pages && (
              <button
                type="button"
                className="min-h-11 w-full rounded-md border border-dashed border-sys-line text-sys-muted"
                onClick={() => {
                  change([...pages, []], pages)
                  requestAnimationFrame(() => scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: 'smooth' }))
                }}
              >
                + Seite
              </button>
            )}
            <p className="text-center text-xs text-sys-muted">
              {penSeen ? 'Pencil erkannt: Der Stift schreibt, mit dem Finger scrollst du.' : 'Mit dem Apple Pencil schreibt nur der Stift, der Finger scrollt dann.'}
            </p>
          </div>
        </div>
      </div>
    </dialog>
  )
}
