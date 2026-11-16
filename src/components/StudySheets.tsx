import { useMemo, useRef, useState } from 'react'
import { format } from 'date-fns'
import Markdown from 'react-markdown'
import remarkBreaks from 'remark-breaks'
import { Button, Dialog, DrawingEditor, DrawingPreview, FileViewer, PhotoCapture, SystemWindow, TextField } from './ui'
import { shareBlob } from '../lib/uni'
import { db, type PhotoRecord, type SheetRecord } from '../db/db'
import { useObjectUrl } from '../lib/photos'
import { addSheetPhoto, deleteSheet, saveSheet, usePhotos, useSheets } from '../lib/sheets'
import { isEmpty } from '../lib/drawing'
import { createDrawing, deleteDrawings } from '../lib/drawings'

type Draft = {
  id?: number
  title: string
  text: string
  photoIds: number[]
  added: number[]
  removed: number[]
  drawingIds: number[]
  addedDrawings: number[]
  removedDrawings: number[]
}

const TOOLS = [
  { label: 'Überschrift', insert: '\n## ' },
  { label: 'Liste', insert: '\n- ' },
  { label: 'Fett', wrap: '**' },
] as const

const md = 'space-y-2 [&_h1]:text-lg [&_h1]:font-semibold [&_h1]:text-sys-glow [&_h2]:font-semibold [&_h2]:text-sys-glow [&_h3]:font-semibold [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_strong]:text-sys-text [&_code]:rounded [&_code]:bg-sys-line/40 [&_code]:px-1'

export function StudySheets({ subjectId }: { subjectId: number }) {
  const sheets = useSheets(subjectId)
  const [open, setOpen] = useState<SheetRecord | null>(null)
  const [draft, setDraft] = useState<Draft | null>(null)
  const area = useRef<HTMLTextAreaElement>(null)
  const [drawing, setDrawing] = useState<number | null>(null)
  const [viewing, setViewing] = useState<PhotoRecord | null>(null)
  const viewFile = useMemo(() => (viewing ? { blob: viewing.blob, name: 'Foto.jpg' } : null), [viewing])
  const viewer = (
    <FileViewer
      file={viewFile}
      onClose={() => setViewing(null)}
      onShare={() => viewing && shareBlob(viewing.blob, 'Foto.jpg')}
    />
  )

  const edit = (s?: SheetRecord) =>
    setDraft({
      id: s?.id,
      title: s?.title ?? '',
      text: s?.text ?? '',
      photoIds: s?.photoIds ?? [],
      added: [],
      removed: [],
      drawingIds: s?.drawingIds ?? [],
      addedDrawings: [],
      removedDrawings: [],
    })

  const cancel = async () => {
    if (draft?.added.length) await db.photos.bulkDelete(draft.added)
    if (draft?.addedDrawings.length) await deleteDrawings(draft.addedDrawings)
    setDraft(null)
  }

  const save = async () => {
    if (!draft?.title.trim()) return
    await saveSheet(subjectId, { id: draft.id, title: draft.title.trim(), text: draft.text, photoIds: draft.photoIds, drawingIds: draft.drawingIds })
    if (draft.removed.length) await db.photos.bulkDelete(draft.removed)
    if (draft.removedDrawings.length) await deleteDrawings(draft.removedDrawings)
    if (open && open.id === draft.id) setOpen(await db.sheets.get(open.id) ?? null)
    setDraft(null)
  }

  const tool = (t: (typeof TOOLS)[number]) => {
    if (!draft) return
    const el = area.current
    const start = el?.selectionStart ?? draft.text.length
    const end = el?.selectionEnd ?? draft.text.length
    const sel = draft.text.slice(start, end)
    const piece = 'wrap' in t ? `${t.wrap}${sel || 'Text'}${t.wrap}` : `${start === 0 ? t.insert.trimStart() : t.insert}${sel}`
    setDraft({ ...draft, text: draft.text.slice(0, start) + piece + draft.text.slice(end) })
    requestAnimationFrame(() => {
      el?.focus()
      el?.setSelectionRange(start + piece.length, start + piece.length)
    })
  }

  if (open && !draft) {
    return (
      <SystemWindow title={open.title}>
        <div className={md}>
          <Markdown remarkPlugins={[remarkBreaks]}>{open.text}</Markdown>
        </div>
        {(open.drawingIds ?? []).map((d) => (
          <DrawingPreview key={d} id={d} allPages className="mt-3" onClick={() => setDrawing(d)} />
        ))}
        <SheetPhotos ids={open.photoIds} onOpen={setViewing} />
        <DrawingEditor id={drawing} onClose={() => setDrawing(null)} />
        {viewer}
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Button variant="ghost" onClick={() => setOpen(null)}>
            Zurück
          </Button>
          <Button onClick={() => edit(open)}>Bearbeiten</Button>
        </div>
      </SystemWindow>
    )
  }

  return (
    <>
      <SystemWindow title="Lernzettel">
        {!sheets?.length && <p className="mb-3 text-center text-sm text-sys-muted">Noch keine Lernzettel.</p>}
        <ul className="divide-y divide-sys-line">
          {sheets?.map((s) => (
            <li key={s.id}>
              <button type="button" className="w-full py-2 text-left" onClick={() => setOpen(s)}>
                <span className="block font-semibold">{s.title}</span>
                <span className="block truncate text-xs text-sys-muted">
                  {format(s.updatedAt, 'd.M.yy')}
                  {s.photoIds.length > 0 && ` · ${s.photoIds.length} ${s.photoIds.length === 1 ? 'Foto' : 'Fotos'}`}
                  {!!s.drawingIds?.length && ' · Handschrift'}
                  {s.text && ` · ${s.text.replace(/[#*\-\n]+/g, ' ').trim()}`}
                </span>
              </button>
            </li>
          ))}
        </ul>
        <Button className="mt-3 w-full" onClick={() => edit()}>
          + Lernzettel
        </Button>
      </SystemWindow>

      <Dialog open={!!draft} onClose={cancel} title={draft?.id ? 'Lernzettel bearbeiten' : 'Neuer Lernzettel'}>
        {draft && (
          <div className="space-y-3">
            <TextField label="Titel" value={draft.title} onChange={(title) => setDraft({ ...draft, title })} placeholder="z. B. Kapitel 2 – Ableitungen" />
            <div className="flex gap-2">
              {TOOLS.map((t) => (
                <button
                  key={t.label}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => tool(t)}
                  className="rounded-full border border-sys-line px-3 py-1 text-xs text-sys-muted"
                >
                  {t.label}
                </button>
              ))}
            </div>
            <TextField multiline rows={10} textareaRef={area} value={draft.text} onChange={(text) => setDraft({ ...draft, text })} placeholder="Text …" />
            <SheetPhotos
              ids={draft.photoIds}
              onOpen={setViewing}
              onRemove={(id) =>
                setDraft({
                  ...draft,
                  photoIds: draft.photoIds.filter((p) => p !== id),
                  removed: draft.added.includes(id) ? draft.removed : [...draft.removed, id],
                  added: draft.added.filter((p) => p !== id),
                })
              }
            />
            {draft.drawingIds.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {draft.drawingIds.map((d) => (
                  <div key={d} className="relative">
                    <DrawingPreview id={d} onClick={() => setDrawing(d)} />
                    <button
                      type="button"
                      aria-label="Handschrift entfernen"
                      onClick={() =>
                        setDraft({
                          ...draft,
                          drawingIds: draft.drawingIds.filter((x) => x !== d),
                          removedDrawings: draft.addedDrawings.includes(d) ? draft.removedDrawings : [...draft.removedDrawings, d],
                          addedDrawings: draft.addedDrawings.filter((x) => x !== d),
                        })
                      }
                      className="absolute right-1 top-1 h-6 w-6 rounded-full bg-sys-bg/80 text-xs text-sys-danger"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
            <Button
              variant="ghost"
              className="w-full"
              onClick={async () => {
                const id = await createDrawing()
                setDraft((d) => d && { ...d, drawingIds: [...d.drawingIds, id], addedDrawings: [...d.addedDrawings, id] })
                setDrawing(id)
              }}
            >
              ✎ Handschrift
            </Button>
            <PhotoCapture
              label="+ Foto"
              onCapture={async (blob) => {
                const id = await addSheetPhoto(blob)
                setDraft((d) => d && { ...d, photoIds: [...d.photoIds, id], added: [...d.added, id] })
              }}
            />
            <div className={`grid gap-2 ${draft.id ? 'grid-cols-2' : ''}`}>
              {draft.id && (
                <Button
                  variant="danger"
                  onClick={async () => {
                    await deleteSheet(draft.id!)
                    setDraft(null)
                    setOpen(null)
                  }}
                >
                  Löschen
                </Button>
              )}
              <Button disabled={!draft.title.trim()} onClick={save}>
                Speichern
              </Button>
            </div>
          </div>
        )}
      </Dialog>
      {draft && (
        <DrawingEditor
          id={drawing}
          onClose={async () => {
            const id = drawing
            setDrawing(null)
            const d = id ? await db.drawings.get(id) : undefined
            if (id && d && isEmpty(d.pages) && draft.addedDrawings.includes(id)) {
              await deleteDrawings([id])
              setDraft((x) => x && { ...x, drawingIds: x.drawingIds.filter((y) => y !== id), addedDrawings: x.addedDrawings.filter((y) => y !== id) })
            }
          }}
        />
      )}
      {viewer}
    </>
  )
}

function SheetPhotos({ ids, onRemove, onOpen }: { ids: number[]; onRemove?: (id: number) => void; onOpen: (p: PhotoRecord) => void }) {
  const photos = usePhotos(ids)
  if (!photos?.length) return null
  return (
    <div className="mt-3 grid grid-cols-3 gap-2">
      {photos.map((p) => (
        <Thumb key={p.id} photo={p} onRemove={onRemove} onOpen={() => onOpen(p)} />
      ))}
    </div>
  )
}

function Thumb({ photo, onRemove, onOpen }: { photo: PhotoRecord; onRemove?: (id: number) => void; onOpen: () => void }) {
  const url = useObjectUrl(photo.blob)
  return (
    <div className="relative">
      <button type="button" className="block w-full" onClick={onOpen}>
        <img src={url} alt="" className="aspect-square w-full rounded border border-sys-line object-cover" />
      </button>
      {onRemove && (
        <button
          type="button"
          aria-label="Foto entfernen"
          onClick={() => onRemove(photo.id)}
          className="absolute right-1 top-1 h-6 w-6 rounded-full bg-sys-bg/80 text-xs text-sys-danger"
        >
          ✕
        </button>
      )}
    </div>
  )
}
