import type { ReactNode } from 'react'

type Props = {
  title?: string
  children: ReactNode
  className?: string
}

export function SystemWindow({ title, children, className = '' }: Props) {
  return (
    <section
      className={`rounded-lg border border-sys-glow/60 bg-sys-panel/80 p-4 shadow-glow backdrop-blur ${className}`}
    >
      {title && (
        <header className="mb-3 border-b border-sys-line pb-2 text-center text-sm font-semibold uppercase tracking-[0.25em] text-sys-glow">
          {title}
        </header>
      )}
      {children}
    </section>
  )
}
