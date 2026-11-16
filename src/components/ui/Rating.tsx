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
            className={`min-h-11 rounded-2xl text-lg font-bold transition-colors ${
              n === value
                ? 'bg-white text-black'
                : 'bg-sys-raised text-sys-muted active:bg-sys-line'
            }`}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  )
}
