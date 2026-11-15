import { useState, type ReactNode } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { PinPad, SystemWindow } from './ui'
import { getSetting } from '../db/settings'
import { tryUnlock, useUnlocked } from '../lib/pin'

export function PinGate({ children }: { children: ReactNode }) {
  const pinHash = useLiveQuery(() => getSetting('pinHash'))
  const unlocked = useUnlocked()
  const [error, setError] = useState('')

  if (pinHash === undefined) return null
  if (!pinHash || unlocked) return children

  return (
    <SystemWindow title="Gesperrt">
      <PinPad
        prompt="PIN eingeben"
        error={error}
        onComplete={async (pin) => setError((await tryUnlock(pin)) ? '' : 'Falsche PIN')}
      />
    </SystemWindow>
  )
}
