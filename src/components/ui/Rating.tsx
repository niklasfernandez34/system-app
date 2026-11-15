type Props = {
  value: number
  onChange: (value: number) => void
  label?: string
  max?: number
}

export function Rating({ value, onChange, label, max = 5 }: Props) {
  return (
    <div>
      {label && <span className="mb-1 block text-xs text-sys-muted">{label}</span>}
      <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${max}, minmax(0, 1fr))` }}>
        {Array.from({ length: max }, (_, i) => i + 1).map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className={`min-h-11 rounded-md border text-lg font-semibold transition-colors ${
              n === value
                ? 'border-sys-glow bg-sys-glow/20 text-sys-text shadow-glow'
                : 'border-sys-line text-sys-muted active:bg-sys-line/30'
            }`}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  )
}
