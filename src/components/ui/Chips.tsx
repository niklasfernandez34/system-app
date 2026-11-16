type Props<T extends string> = {
  options: readonly T[]
  value: T
  onChange: (value: T) => void
  label?: string
}

export function Chips<T extends string>({ options, value, onChange, label }: Props<T>) {
  return (
    <div>
      {label && <span className="mb-1 block text-xs text-sys-muted">{label}</span>}
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <button
            key={o}
            type="button"
            onClick={() => onChange(o)}
            className={`min-h-9 rounded-full border px-3 text-sm transition-colors ${
              o === value ? 'border-sys-glow bg-sys-glow/15 text-sys-text shadow-glow' : 'border-sys-line text-sys-muted'
            }`}
          >
            {o}
          </button>
        ))}
      </div>
    </div>
  )
}

type MultiProps<T extends string> = {
  options: readonly T[]
  value: readonly T[]
  onChange: (value: T[]) => void
  label?: string
}

export function MultiChips<T extends string>({ options, value, onChange, label }: MultiProps<T>) {
  const toggle = (o: T) => onChange(value.includes(o) ? value.filter((v) => v !== o) : options.filter((x) => x === o || value.includes(x)))
  return (
    <div>
      {label && <span className="mb-1 block text-xs text-sys-muted">{label}</span>}
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <button
            key={o}
            type="button"
            aria-pressed={value.includes(o)}
            onClick={() => toggle(o)}
            className={`min-h-9 rounded-full border px-3 text-sm transition-colors ${
              value.includes(o) ? 'border-sys-glow bg-sys-glow/15 text-sys-text shadow-glow' : 'border-sys-line text-sys-muted'
            }`}
          >
            {value.includes(o) ? '✓ ' : ''}
            {o}
          </button>
        ))}
      </div>
    </div>
  )
}
