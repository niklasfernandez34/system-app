import { useEffect, useState } from 'react'
import { Button, ProgressBar } from './ui'
import { beep } from '../lib/beep'
import { updateWorkout } from '../lib/sport'

type Props = { workoutId: number; endsAt: number; total: number }

export function RestTimer({ workoutId, endsAt, total }: Props) {
  const [now, setNow] = useState(() => Date.now())
  const left = Math.max(0, Math.ceil((endsAt - now) / 1000))

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 250)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    if (left > 0) return
    beep()
    updateWorkout(workoutId, { restEndsAt: undefined })
  }, [left, workoutId])

  const mm = Math.floor(left / 60)
  const ss = String(left % 60).padStart(2, '0')

  return (
    <div className="rounded-lg border border-sys-glow bg-sys-panel/95 p-3 shadow-glow backdrop-blur">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs uppercase tracking-[0.25em] text-sys-glow">Pause</span>
        <span className="font-mono text-2xl tabular-nums">
          {mm}:{ss}
        </span>
      </div>
      <ProgressBar value={left} max={Math.max(total, left)} />
      <div className="mt-2 grid grid-cols-2 gap-2">
        <Button variant="ghost" onClick={() => updateWorkout(workoutId, { restEndsAt: endsAt + 30_000 })}>
          +30 s
        </Button>
        <Button variant="ghost" onClick={() => updateWorkout(workoutId, { restEndsAt: undefined })}>
          Überspringen
        </Button>
      </div>
    </div>
  )
}
