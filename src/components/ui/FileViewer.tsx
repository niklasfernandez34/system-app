import { useEffect, useRef } from 'react'
import { useObjectUrl } from '../../lib/photos'

type Props = { file: { blob: Blob; name: string; type?: string } | null; onClose: () => void; onShare?: () => void }

export function FileViewer({ file, onClose, onShare }: Props) {
  const ref = useRef<HTMLDialogElement>(null)
  const url = useObjectUrl(file?.blob)

  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (file && !d.open) d.showModal()
    if (!file && d.open) d.close()
  }, [file])

  const type = file?.type || file?.blob.type || ''
  const btn = 'min-h-9 rounded-md border border-sys-line px-3 text-sm text-sys-muted active:bg-sys-line/30'

  return (
    <dialog
      ref={ref}
      onCancel={(e) => {
        e.preventDefault()
        onClose()
      }}
      className="m-0 h-[100dvh] max-h-none w-screen max-w-none bg-sys-bg p-0 text-sys-text"
    >
      {file && url && (
        <div className="flex h-full flex-col">
          <div className="pt-safe px-safe border-b border-sys-line bg-sys-panel/95">
            <div className="mx-auto flex max-w-4xl items-center gap-2 p-2">
              <button type="button" className={`${btn} border-sys-glow text-sys-text`} onClick={onClose}>
                Schließen
              </button>
              <span className="min-w-0 flex-1 truncate text-center text-sm">{file.name}</span>
              {onShare && (
                <button type="button" className={btn} onClick={onShare}>
                  Teilen
                </button>
              )}
            </div>
          </div>
          <div className="px-safe pb-safe flex-1 overflow-auto">
            {type.startsWith('image/') ? (
              <img src={url} alt={file.name} className="mx-auto block h-full w-full object-contain" />
            ) : type.startsWith('video/') ? (
              <video src={url} controls playsInline className="mx-auto block h-full w-full" />
            ) : type === 'application/pdf' || type.startsWith('text/') ? (
              <iframe src={url} title={file.name} className="block h-full w-full bg-white" />
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
                <p className="text-sys-muted">Diese Datei kann die App nicht selbst anzeigen.</p>
                {onShare && (
                  <button type="button" className={`${btn} border-sys-glow text-sys-text`} onClick={onShare}>
                    In anderer App öffnen
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </dialog>
  )
}
