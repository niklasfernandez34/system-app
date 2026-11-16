import type { Ref } from 'react'

type Props = {
  value: string
  onChange: (value: string) => void
  label?: string
  placeholder?: string
  multiline?: boolean
  rows?: number
  textareaRef?: Ref<HTMLTextAreaElement>
}

const base =
  'w-full rounded-2xl border border-sys-line bg-sys-bg/60 px-3 py-2 text-base text-sys-text outline-none placeholder:text-sys-muted/60 focus:border-sys-glow'

export function TextField({ value, onChange, label, placeholder, multiline, rows = 4, textareaRef }: Props) {
  return (
    <label className="block">
      {label && <span className="mb-1 block text-xs text-sys-muted">{label}</span>}
      {multiline ? (
        <textarea
          ref={textareaRef}
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
