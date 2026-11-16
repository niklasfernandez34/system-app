import { useState } from 'react'

type Props = {
  value: number
  onChange: (value: number) => void
  step?: number
  min?: number
  max?: number
  label?: string
  unit?: string
}

const show = (n: number) => (Number.isFinite(n) ? String(n).replace('.', ',') : '')

export function NumberInput({ value, onChange, step = 1, min, max, label, unit }: Props) {
  const [draft, setDraft] = useState<string | null>(null)

  const clamp = (n: number) => {
    let v = Math.round(n * 1000) / 1000
    if (min !== undefined) v = Math.max(min, v)
    if (max !== undefined) v = Math.min(max, v)
    return v
  }

  const stepBy = (d: number) => {
    setDraft(null)
    onChange(clamp(value + d))
  }

  return (
    <label className="block">
      {label && <span className="mb-1 block text-center text-xs font-medium text-sys-muted">{label}</span>}
      <div className="flex items-stretch gap-2">
        <button
          type="button"
          className="h-11 w-11 shrink-0 self-center rounded-full bg-sys-raised text-xl font-semibold text-sys-text active:bg-sys-line"
          onClick={() => stepBy(-step)}
        >
          −
        </button>
        <div className="flex flex-1 items-center rounded-2xl bg-sys-bg/60 px-3">
          <input
            type="text"
            inputMode="decimal"
            className="w-full bg-transparent py-2 text-center text-xl font-bold outline-none"
            value={draft ?? show(value)}
            onFocus={(e) => e.target.select()}
            onChange={(e) => {
              const text = e.target.value.replace(/[^\d.,-]/g, '')
              setDraft(text)
              const n = parseFloat(text.replace(',', '.'))
              if (!Number.isNaN(n) && (min === undefined || n >= min) && (max === undefined || n <= max)) {
                onChange(Math.round(n * 1000) / 1000)
              }
            }}
            onBlur={() => {
              if (draft === null) return
              const n = parseFloat(draft.replace(',', '.'))
              if (!Number.isNaN(n)) onChange(clamp(n))
              setDraft(null)
            }}
          />
          {unit && <span className="text-sm text-sys-muted">{unit}</span>}
        </div>
        <button
          type="button"
          className="h-11 w-11 shrink-0 self-center rounded-full bg-sys-raised text-xl font-semibold text-sys-text active:bg-sys-line"
          onClick={() => stepBy(step)}
        >
          +
        </button>
      </div>
    </label>
  )
}
