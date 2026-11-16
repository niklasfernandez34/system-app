import type { ReactNode } from 'react'

type Props = {
  title?: string
  children: ReactNode
  className?: string
}

export function SystemWindow({ title, children, className = '' }: Props) {
  return (
    <section className={className}>
      {title && (
        <h2 className="mb-2 px-1 text-[11px] font-bold uppercase tracking-[0.12em] text-sys-muted">{title}</h2>
      )}
      <div className="card p-4">{children}</div>
    </section>
  )
}
