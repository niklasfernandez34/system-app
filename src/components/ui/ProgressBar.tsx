type Props = {
  value: number
  max: number
  label?: string
  color?: string
}

export function ProgressBar({ value, max, label, color }: Props) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0
  return (
    <div>
      {label && (
        <div className="mb-1.5 flex justify-between text-xs font-medium text-sys-muted">
          <span>{label}</span>
          <span>
            {value} / {max}
          </span>
        </div>
      )}
      <div className="h-1.5 overflow-hidden rounded-full bg-sys-raised">
        <div
          className="h-full rounded-full bg-sys-glow transition-[width] duration-500"
          style={{ width: `${pct}%`, ...(color && { background: color }) }}
        />
      </div>
    </div>
  )
}
