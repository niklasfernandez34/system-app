type Props = {
  value: number
  onChange: (value: number) => void
  step?: number
  min?: number
  max?: number
  label?: string
  unit?: string
}

export function NumberInput({ value, onChange, step = 1, min, max, label, unit }: Props) {
  const clamp = (n: number) => {
    let v = Math.round(n * 1000) / 1000
    if (min !== undefined) v = Math.max(min, v)
    if (max !== undefined) v = Math.min(max, v)
    return v
  }

  return (
    <label className="block">
      {label && <span className="mb-1 block text-xs text-sys-muted">{label}</span>}
      <div className="flex items-stretch gap-2">
        <button
          type="button"
          className="w-11 rounded-md border border-sys-line text-xl text-sys-glow active:bg-sys-line/30"
          onClick={() => onChange(clamp(value - step))}
        >
          −
        </button>
        <div className="flex flex-1 items-center rounded-md border border-sys-line bg-sys-bg px-3">
          <input
            type="number"
            inputMode="decimal"
            className="w-full bg-transparent py-2 text-center text-lg outline-none"
            value={Number.isFinite(value) ? value : ''}
            onChange={(e) => {
              const n = parseFloat(e.target.value.replace(',', '.'))
              if (!Number.isNaN(n)) onChange(clamp(n))
            }}
          />
          {unit && <span className="text-sm text-sys-muted">{unit}</span>}
        </div>
        <button
          type="button"
          className="w-11 rounded-md border border-sys-line text-xl text-sys-glow active:bg-sys-line/30"
          onClick={() => onChange(clamp(value + step))}
        >
          +
        </button>
      </div>
    </label>
  )
}
