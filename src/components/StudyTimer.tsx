import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { Button, Chips, ProgressBar } from './ui'
import { XP } from '../config/xp'
import { setSetting, useSetting } from '../db/settings'
import { beep, unlockAudio } from '../lib/beep'
import { finishStudyIfDue, startStudy, stopStudy, useStudyToday, useSubjects } from '../lib/uni'

const FOCUS = ['25', '30', '45', '50'] as const
const BREAK = ['5', '10', '15'] as const

function useTicker() {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 250)
    return () => clearInterval(t)
  }, [])
  return now
}

const clock = (sec: number) => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`

export function StudyTimerFloat() {
  const timer = useSetting('studyTimer')
  const subjects = useSubjects()
  const location = useLocation()
  const navigate = useNavigate()
  const now = useTicker()
  const left = timer ? Math.min(timer.total, Math.max(0, Math.ceil((timer.endsAt - now) / 1000))) : 0

  useEffect(() => {
    if (timer && left === 0) finishStudyIfDue().then((r) => r && beep())
  }, [timer, left])

  const visible =
    location.pathname === '/uni' || (location.pathname === `/uni/fach/${timer?.subjectId}` && !location.search.includes('bereich'))
  if (!timer || visible) return null
  const name = subjects?.find((s) => s.id === timer.subjectId)?.name
  return (
    <button
      type="button"
      onClick={() => navigate('/uni')}
      className="mx-auto mb-2 flex w-[calc(100%-2rem)] max-w-xl items-center justify-between rounded-lg border border-sys-glow bg-sys-panel/95 px-3 py-2 text-sm shadow-glow"
    >
      <span className="text-sys-glow">{timer.phase === 'focus' ? `Lernen · ${name ?? ''}` : 'Pause'}</span>
      <span className="font-mono tabular-nums">{clock(left)}</span>
    </button>
  )
}

export function StudyTimer({ subjectId: fixed }: { subjectId?: number }) {
  const timer = useSetting('studyTimer')
  const focus = useSetting('focusMinutes')
  const brk = useSetting('breakMinutes')
  const subjects = useSubjects()?.filter((s) => !s.archived)
  const today = useStudyToday()
  const [subjectId, setSubjectId] = useState<number>()
  const now = useTicker()
  const left = timer ? Math.min(timer.total, Math.max(0, Math.ceil((timer.endsAt - now) / 1000))) : 0
  const chosen = subjects?.find((s) => s.id === (fixed ?? subjectId)) ?? (fixed ? undefined : subjects?.[0])

  useEffect(() => {
    if (timer && left === 0) finishStudyIfDue().then((r) => r && beep())
  }, [timer, left])

  if (!subjects) return null
  if (!subjects.length) return <p className="text-center text-sys-muted">Lege unten ein Fach an, um zu lernen.</p>
  const other = timer && fixed && timer.subjectId !== fixed

  const summary = today && (
    <p className="text-center text-xs text-sys-muted">
      Heute: {today.count} {today.count === 1 ? 'Einheit' : 'Einheiten'} · {today.minutes} Min.
    </p>
  )

  if (timer && !other) {
    const name = subjects.find((s) => s.id === timer.subjectId)?.name ?? ''
    return (
      <div className="space-y-3">
        <p className="text-center text-xs uppercase tracking-[0.25em] text-sys-glow">
          {timer.phase === 'focus' ? `Lernen · ${name}` : 'Pause'}
        </p>
        <p className="text-center font-mono text-5xl tabular-nums">{clock(left)}</p>
        <ProgressBar value={timer.total - left} max={timer.total} />
        <Button variant="ghost" className="w-full" onClick={stopStudy}>
          {timer.phase === 'focus' ? 'Abbrechen (ohne XP)' : 'Pause beenden'}
        </Button>
        {summary}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {!fixed && (
        <Chips
          label="Fach"
          options={subjects.map((s) => s.name)}
          value={chosen?.name ?? ''}
          onChange={(n) => setSubjectId(subjects.find((s) => s.name === n)?.id)}
        />
      )}
      <Chips
        label="Lernzeit (Min.)"
        options={FOCUS}
        value={String(focus) as (typeof FOCUS)[number]}
        onChange={(v) => setSetting('focusMinutes', Number(v))}
      />
      <Chips
        label="Pause (Min.)"
        options={BREAK}
        value={String(brk) as (typeof BREAK)[number]}
        onChange={(v) => setSetting('breakMinutes', Number(v))}
      />
      <Button
        className="w-full"
        disabled={!chosen || !!other}
        onClick={() => {
          unlockAudio()
          if (chosen) startStudy(chosen.id)
        }}
      >
        Lernen starten (+{XP.study_session} XP)
      </Button>
      {other && <p className="text-center text-xs text-sys-muted">Gerade läuft ein Timer für ein anderes Fach.</p>}
      {summary}
    </div>
  )
}
