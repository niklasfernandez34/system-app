import { useState } from 'react'

type Props = {
  onComplete: (pin: string) => void
  prompt?: string
  error?: string
  length?: number
}

const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫']

export function PinPad({ onComplete, prompt, error, length = 4 }: Props) {
  const [pin, setPin] = useState('')

  const press = (k: string) => {
    if (k === '⌫') return setPin((p) => p.slice(0, -1))
    const next = pin + k
    if (next.length < length) return setPin(next)
    setPin('')
    onComplete(next)
  }

  return (
    <div className="mx-auto max-w-64 text-center">
      {prompt && <p className="mb-3 text-sm text-sys-muted">{prompt}</p>}
      <div className="mb-2 flex justify-center gap-3">
        {Array.from({ length }, (_, i) => (
          <span
            key={i}
            className={`h-3 w-3 rounded-full border border-sys-muted ${i < pin.length ? 'border-white bg-white' : ''}`}
          />
        ))}
      </div>
      <p className="mb-3 h-5 text-sm text-sys-danger">{error}</p>
      <div className="grid grid-cols-3 gap-2">
        {keys.map((k, i) =>
          k ? (
            <button
              key={i}
              type="button"
              onClick={() => press(k)}
              className="min-h-14 rounded-full bg-sys-raised text-xl font-semibold text-sys-text active:bg-sys-line"
            >
              {k}
            </button>
          ) : (
            <span key={i} />
          ),
        )}
      </div>
    </div>
  )
}
