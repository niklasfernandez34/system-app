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
    <div className="rounded-[1.375rem] border border-sys-line bg-sys-panel/90 p-4 shadow-card backdrop-blur-xl">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-semibold text-sys-muted">Pause</span>
        <span className="text-3xl font-extrabold tabular-nums text-sys-glow">
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
