import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Button, Dialog } from './ui'
import { XP } from '../config/xp'
import { db } from '../db/db'
import { getSetting, setSetting } from '../db/settings'
import { checkBosses, useNutritionStamp } from '../lib/bosses'
import { roman } from '../lib/level'
import { ensureTodayQuests, syncQuestBonus, useQuests } from '../lib/quests'
import { ensureRankRecord, tryRankUp, useRankState } from '../lib/ranks'
import { loadTitles } from '../lib/titleHooks'

type Notice =
  | { kind: 'stage'; rank: string; stage: number }
  | { kind: 'rank'; rank: string }
  | { kind: 'title'; names: string[] }
  | { kind: 'boss'; attr: string }

const HEADINGS = { stage: 'STUFE AUF!', rank: 'RANGAUFSTIEG!', title: 'TITEL ERHALTEN!', boss: 'BOSS BESIEGT!' }

let titlesBusy = false

async function newTitles() {
  if (titlesBusy) return []
  titlesBusy = true
  try {
    const unlocked = (await loadTitles()).filter((t) => t.unlocked)
    const seen = await getSetting('seenTitles')
    await setSetting('seenTitles', unlocked.map((t) => t.id))
    if (!seen) return []
    return unlocked.filter((t) => !seen.includes(t.id)).map((t) => t.name)
  } finally {
    titlesBusy = false
  }
}

export function SystemWatcher() {
  const s = useRankState()
  const quests = useQuests()
  const seen = useLiveQuery(() => getSetting('seenStage'))
  const eventCount = useLiveQuery(() => db.events.count())
  const nutritionStamp = useNutritionStamp()
  const [queue, setQueue] = useState<Notice[]>([])
  const push = (n: Notice) => setQueue((q) => [...q, n])
  const notice = queue[0]

  useEffect(() => {
    if (quests?.day) ensureTodayQuests()
  }, [quests?.day])

  useEffect(() => {
    if (quests) syncQuestBonus()
  }, [quests])

  useEffect(() => {
    if (!s) return
    ensureRankRecord()
    if (s.ready && s.passed) tryRankUp()
  }, [s])

  useEffect(() => {
    if (eventCount === undefined) return
    checkBosses().then((won) => won.forEach((b) => push({ kind: 'boss', attr: b.attr })))
    newTitles().then((names) => names.length && push({ kind: 'title', names }))
  }, [eventCount, nutritionStamp])

  useEffect(() => {
    if (!s || seen === undefined) return
    const pos = s.rankIndex * 100 + s.stage
    if (pos <= seen) return
    if (seen > 0) {
      push(s.rankIndex > Math.floor(seen / 100) ? { kind: 'rank', rank: s.rank } : { kind: 'stage', rank: s.rank, stage: s.stage })
    }
    setSetting('seenStage', pos)
  }, [s, seen])

  const close = () => setQueue((q) => q.slice(1))

  return (
    <Dialog open={!!notice} onClose={close} title="Benachrichtigung">
      {notice && (
        <div key={queue.length} className="space-y-4 text-center">
          <p className="animate-level-up text-3xl font-bold tracking-[0.2em] text-sys-glow">
            {HEADINGS[notice.kind]}
          </p>
          {notice.kind === 'rank' && (
            <p className="animate-level-up text-lg">
              Neuer Rang: <span className="text-4xl font-bold text-sys-glow">{notice.rank}</span>
            </p>
          )}
          {notice.kind === 'stage' && (
            <p className="text-lg">
              Du hast <span className="font-bold text-sys-glow">{notice.rank} · Stufe {roman(notice.stage)}</span> erreicht.
            </p>
          )}
          {notice.kind === 'title' && (
            <ul className="space-y-1">
              {notice.names.map((n) => (
                <li key={n} className="text-lg font-semibold text-sys-glow">
                  🏅 {n}
                </li>
              ))}
            </ul>
          )}
          {notice.kind === 'boss' && <p className="text-lg">+{XP.boss_defeated} XP auf {notice.attr}.</p>}
          <Button className="w-full" onClick={close}>
            Weiter
          </Button>
        </div>
      )}
    </Dialog>
  )
}
