import { BrowserMultiFormatReader, type IScannerControls } from '@zxing/browser'
import { BarcodeFormat, DecodeHintType } from '@zxing/library'
import { useEffect, useRef, useState } from 'react'
import { Button } from './Button'
import { Dialog } from './Dialog'

const HINTS = new Map<DecodeHintType, unknown>([
  [DecodeHintType.TRY_HARDER, true],
  [DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.EAN_13, BarcodeFormat.EAN_8, BarcodeFormat.UPC_A, BarcodeFormat.UPC_E]],
])

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
    const reader = new BrowserMultiFormatReader(HINTS, { delayBetweenScanAttempts: 150 })
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
        <div className="relative overflow-hidden rounded-xl border border-sys-line bg-black">
          <video ref={video} className="aspect-[4/3] w-full object-cover" playsInline muted />
          <div className="pointer-events-none absolute inset-[15%] rounded-xl border-2 border-sys-glow shadow-glow" />
        </div>
      )}
      <p className="text-center text-xs text-sys-muted">Barcode in den Rahmen halten – egal wie herum.</p>
      <Button variant="ghost" className="w-full" onClick={onClose}>
        Abbrechen
      </Button>
    </div>
  )
}
