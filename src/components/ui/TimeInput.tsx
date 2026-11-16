type Props = {
  value: string
  onChange: (value: string) => void
  label?: string
}

export function TimeInput({ value, onChange, label }: Props) {
  return (
    <label className="block">
      {label && <span className="mb-1 block text-xs text-sys-muted">{label}</span>}
      <input
        type="time"
        className="min-h-11 w-full rounded-md border border-sys-line bg-sys-bg px-3 py-2 text-base text-sys-text outline-none [color-scheme:dark] focus:border-sys-glow"
        value={value}
        onChange={(e) => e.target.value && onChange(e.target.value)}
      />
    </label>
  )
}
