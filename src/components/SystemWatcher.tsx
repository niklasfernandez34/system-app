import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Button, Dialog } from './ui'
import { getSetting, setSetting } from '../db/settings'
import { rankOf } from '../lib/level'
import { useLevel } from '../lib/levelHooks'
import { ensureTodayQuests, syncQuestBonus, useQuests } from '../lib/quests'

type LevelUp = { level: number; rank: string; rankUp: boolean }

export function SystemWatcher() {
  const level = useLevel()
  const quests = useQuests()
  const seen = useLiveQuery(() => getSetting('seenLevel'))
  const [levelUp, setLevelUp] = useState<LevelUp | null>(null)

  useEffect(() => {
    if (quests?.day) ensureTodayQuests()
  }, [quests?.day])

  useEffect(() => {
    if (quests) syncQuestBonus()
  }, [quests])

  useEffect(() => {
    if (!level || seen === undefined || level.level <= seen) return
    if (seen > 0) setLevelUp({ level: level.level, rank: level.rank, rankUp: rankOf(seen) !== level.rank })
    setSetting('seenLevel', level.level)
  }, [level, seen])

  return (
    <Dialog open={!!levelUp} onClose={() => setLevelUp(null)} title="Benachrichtigung">
      {levelUp && (
        <div className="space-y-4 text-center">
          <p className="animate-level-up text-3xl font-bold tracking-[0.2em] text-sys-glow [text-shadow:0_0_16px_var(--color-sys-glow)]">
            LEVEL UP!
          </p>
          <p className="text-lg">
            Du hast <span className="font-bold text-sys-glow">Level {levelUp.level}</span> erreicht.
          </p>
          {levelUp.rankUp && (
            <p className="animate-level-up text-lg">
              Neuer Rang: <span className="text-2xl font-bold text-sys-glow">{levelUp.rank}</span>
            </p>
          )}
          <Button className="w-full" onClick={() => setLevelUp(null)}>
            Weiter
          </Button>
        </div>
      )}
    </Dialog>
  )
}
