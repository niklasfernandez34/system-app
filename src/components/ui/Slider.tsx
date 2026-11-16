type Props = { value: number; onChange: (v: number) => void; min?: number; max?: number; label?: string }

export function Slider({ value, onChange, min = 0, max = 100, label }: Props) {
  return (
    <label className="block">
      {label && <span className="mb-1 block text-xs text-sys-muted">{label}</span>}
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-11 w-full accent-sys-glow"
      />
    </label>
  )
}
