import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Button, Dialog } from './ui'
import { getSetting, setSetting } from '../db/settings'
import { roman } from '../lib/level'
import { ensureTodayQuests, syncQuestBonus, useQuests } from '../lib/quests'
import { ensureRankRecord, tryRankUp, useRankState } from '../lib/ranks'

type Notice = { rank: string; stage: number; rankUp: boolean }

export function SystemWatcher() {
  const s = useRankState()
  const quests = useQuests()
  const seen = useLiveQuery(() => getSetting('seenStage'))
  const [notice, setNotice] = useState<Notice | null>(null)

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
    if (!s || seen === undefined) return
    const pos = s.rankIndex * 100 + s.stage
    if (pos <= seen) return
    if (seen > 0) setNotice({ rank: s.rank, stage: s.stage, rankUp: s.rankIndex > Math.floor(seen / 100) })
    setSetting('seenStage', pos)
  }, [s, seen])

  return (
    <Dialog open={!!notice} onClose={() => setNotice(null)} title="Benachrichtigung">
      {notice && (
        <div className="space-y-4 text-center">
          <p className="animate-level-up text-3xl font-bold tracking-[0.2em] text-sys-glow [text-shadow:0_0_16px_var(--color-sys-glow)]">
            {notice.rankUp ? 'RANGAUFSTIEG!' : 'STUFE AUF!'}
          </p>
          {notice.rankUp ? (
            <p className="animate-level-up text-lg">
              Neuer Rang: <span className="text-4xl font-bold text-sys-glow">{notice.rank}</span>
            </p>
          ) : (
            <p className="text-lg">
              Du hast <span className="font-bold text-sys-glow">{notice.rank} · Stufe {roman(notice.stage)}</span>{' '}
              erreicht.
            </p>
          )}
          <Button className="w-full" onClick={() => setNotice(null)}>
            Weiter
          </Button>
        </div>
      )}
    </Dialog>
  )
}
