type Props = {
  value: number
  max: number
  label?: string
}

export function ProgressBar({ value, max, label }: Props) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0
  return (
    <div>
      {label && (
        <div className="mb-1 flex justify-between text-xs text-sys-muted">
          <span>{label}</span>
          <span>
            {value} / {max}
          </span>
        </div>
      )}
      <div className="h-3 overflow-hidden rounded-full border border-sys-line bg-sys-bg">
        <div
          className="h-full bg-sys-glow shadow-[0_0_10px_var(--color-sys-glow)] transition-[width] duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
