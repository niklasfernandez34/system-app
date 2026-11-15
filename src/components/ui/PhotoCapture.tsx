import { useRef, useState } from 'react'
import { resizeImage } from '../../lib/image'
import { Button } from './Button'

type Props = {
  onCapture: (blob: Blob) => void
  label?: string
}

export function PhotoCapture({ onCapture, label = 'Foto aufnehmen' }: Props) {
  const input = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)

  return (
    <>
      <input
        ref={input}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={async (e) => {
          const file = e.target.files?.[0]
          e.target.value = ''
          if (!file) return
          setBusy(true)
          try {
            onCapture(await resizeImage(file))
          } finally {
            setBusy(false)
          }
        }}
      />
      <Button type="button" disabled={busy} onClick={() => input.current?.click()}>
        {busy ? 'Verarbeite…' : label}
      </Button>
    </>
  )
}
