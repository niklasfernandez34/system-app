import { useEffect, useRef, type ReactNode } from 'react'
import { SystemWindow } from './SystemWindow'

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
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      className="m-auto w-[min(92vw,28rem)] bg-transparent p-0 text-sys-text backdrop:bg-black/70 backdrop:backdrop-blur-sm"
    >
      <SystemWindow title={title}>{children}</SystemWindow>
    </dialog>
  )
}
