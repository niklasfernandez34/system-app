type Props = {
  value: string
  onChange: (value: string) => void
  label?: string
  placeholder?: string
  multiline?: boolean
  rows?: number
}

const base =
  'w-full rounded-md border border-sys-line bg-sys-bg px-3 py-2 text-base text-sys-text outline-none placeholder:text-sys-muted/60 focus:border-sys-glow'

export function TextField({ value, onChange, label, placeholder, multiline, rows = 4 }: Props) {
  return (
    <label className="block">
      {label && <span className="mb-1 block text-xs text-sys-muted">{label}</span>}
      {multiline ? (
        <textarea
          className={`${base} resize-none`}
          rows={rows}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <input
          className={base}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </label>
  )
}
