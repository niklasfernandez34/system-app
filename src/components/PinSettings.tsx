import { useState } from 'react'
import { Button, Dialog, PinPad, SystemWindow } from './ui'
import { useSetting } from '../db/settings'
import { checkPin, setPin } from '../lib/pin'

type Flow = { action: 'set' | 'remove'; step: 'verify' | 'new' | 'confirm'; first?: string } | null

const prompts = { verify: 'Aktuelle PIN eingeben', new: 'Neue PIN eingeben', confirm: 'Neue PIN wiederholen' }

export function PinSettings() {
  const hasPin = !!useSetting('pinHash')
  const [flow, setFlow] = useState<Flow>(null)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const start = (action: 'set' | 'remove') => {
    setError('')
    setMessage('')
    setFlow({ action, step: hasPin ? 'verify' : 'new' })
  }

  const onPin = async (pin: string) => {
    if (!flow) return
    setError('')
    if (flow.step === 'verify') {
      if (!(await checkPin(pin))) return setError('Falsche PIN')
      if (flow.action === 'remove') {
        await setPin('')
        setMessage('PIN entfernt.')
        return setFlow(null)
      }
      return setFlow({ ...flow, step: 'new' })
    }
    if (flow.step === 'new') return setFlow({ ...flow, step: 'confirm', first: pin })
    if (pin !== flow.first) {
      setError('PINs stimmen nicht überein')
      return setFlow({ ...flow, step: 'new', first: undefined })
    }
    await setPin(pin)
    setMessage('PIN gespeichert.')
    setFlow(null)
  }

  return (
    <SystemWindow title="PIN-Sperre">
      <p className="mb-3 text-sm text-sys-muted">
        Schützt Tagebuch und Fotos vor neugierigen Blicken. Kein echter Schutz der Daten.
      </p>
      <div className="grid grid-cols-2 gap-2">
        <Button onClick={() => start('set')}>{hasPin ? 'PIN ändern' : 'PIN festlegen'}</Button>
        <Button variant="ghost" disabled={!hasPin} onClick={() => start('remove')}>
          PIN entfernen
        </Button>
      </div>
      {message && <p className="mt-3 text-center text-sm text-sys-glow">{message}</p>}

      <Dialog open={!!flow} onClose={() => setFlow(null)} title="PIN">
        {flow && <PinPad key={flow.step} prompt={prompts[flow.step]} error={error} onComplete={onPin} />}
        <Button variant="ghost" className="mt-4 w-full" onClick={() => setFlow(null)}>
          Abbrechen
        </Button>
      </Dialog>
    </SystemWindow>
  )
}
