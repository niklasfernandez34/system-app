import { BrowserMultiFormatReader, type IScannerControls } from '@zxing/browser'
import { useEffect, useRef, useState } from 'react'
import { Button } from './Button'
import { Dialog } from './Dialog'

type Props = {
  open: boolean
  onClose: () => void
  onDetected: (code: string) => void
}

export function BarcodeScanner({ open, onClose, onDetected }: Props) {
  return (
    <Dialog open={open} onClose={onClose} title="Barcode scannen">
      {open && <ScannerView onClose={onClose} onDetected={onDetected} />}
    </Dialog>
  )
}

function ScannerView({ onClose, onDetected }: Omit<Props, 'open'>) {
  const video = useRef<HTMLVideoElement>(null)
  const callback = useRef(onDetected)
  const [error, setError] = useState('')

  useEffect(() => {
    callback.current = onDetected
  }, [onDetected])

  useEffect(() => {
    let controls: IScannerControls | undefined
    let stopped = false
    const reader = new BrowserMultiFormatReader()
    reader
      .decodeFromConstraints({ video: { facingMode: 'environment' } }, video.current!, (result, _err, c) => {
        if (!result || stopped) return
        stopped = true
        c.stop()
        navigator.vibrate?.(50)
        callback.current(result.getText())
      })
      .then((c) => {
        controls = c
        if (stopped) c.stop()
      })
      .catch((e: Error) =>
        setError(
          e.name === 'NotAllowedError'
            ? 'Kein Kamera-Zugriff. Erlaube die Kamera in den iPhone-Einstellungen.'
            : 'Kamera konnte nicht gestartet werden.',
        ),
      )
    return () => {
      stopped = true
      controls?.stop()
    }
  }, [])

  return (
    <div className="space-y-3">
      {error ? (
        <p className="text-center text-sys-danger">{error}</p>
      ) : (
        <div className="relative overflow-hidden rounded-md border border-sys-line bg-black">
          <video ref={video} className="aspect-[4/3] w-full object-cover" playsInline muted />
          <div className="pointer-events-none absolute inset-x-6 top-1/2 h-0.5 -translate-y-1/2 bg-sys-danger/80 shadow-[0_0_8px_var(--color-sys-danger)]" />
        </div>
      )}
      <p className="text-center text-xs text-sys-muted">Barcode in die Mitte halten.</p>
      <Button variant="ghost" className="w-full" onClick={onClose}>
        Abbrechen
      </Button>
    </div>
  )
}
