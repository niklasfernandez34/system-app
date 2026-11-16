import { useEffect, useRef, type ReactNode } from 'react'

type Props = {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
}

export function Dialog({ open, onClose, title, children }: Props) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open && !d.open) d.showModal()
    if (!open && d.open) d.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      onClose={(e) => e.target === e.currentTarget && onClose()}
      onClick={(e) => e.target === ref.current && onClose()}
      className="m-auto w-[min(92vw,28rem)] bg-transparent p-0 text-sys-text backdrop:bg-black/70 backdrop:backdrop-blur-md"
    >
      <div className="card p-5 shadow-card">
        {title && <h2 className="mb-4 text-lg font-extrabold uppercase tracking-wide">{title}</h2>}
        {children}
      </div>
    </dialog>
  )
}
