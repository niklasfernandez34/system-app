import { differenceInCalendarDays, format } from 'date-fns'
import { useState } from 'react'
import { PinGate } from '../components/PinGate'
import { Button, Chips, Dialog, PhotoCapture, SystemWindow } from '../components/ui'
import type { PhotoRecord } from '../db/db'
import { addProgressPhoto, deletePhoto, POSES, useObjectUrl, useProgressPhotos, type Pose } from '../lib/photos'

const FILTERS = ['Alle', ...POSES] as const

export function PhotosPage() {
  return (
    <PinGate>
      <Photos />
    </PinGate>
  )
}

function Photos() {
  const photos = useProgressPhotos()
  const [pose, setPose] = useState<Pose>('Vorne')
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('Alle')
  const [selected, setSelected] = useState<number[]>([])
  const [confirmDelete, setConfirmDelete] = useState(false)

  const shown = photos?.filter((p) => filter === 'Alle' || p.pose === filter) ?? []
  const picked = selected.map((id) => photos?.find((p) => p.id === id)).filter(Boolean) as PhotoRecord[]
  const sorted = [...picked].sort((a, b) => a.createdAt - b.createdAt)

  const toggle = (id: number) =>
    setSelected(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected.slice(-1), id])

  return (
    <div className="space-y-4">
      <SystemWindow title="Neues Foto">
        <div className="space-y-3">
          <Chips label="Ansicht" options={POSES} value={pose} onChange={setPose} />
          <div className="grid">
            <PhotoCapture onCapture={(blob) => addProgressPhoto(blob, pose)} />
          </div>
          <p className="text-center text-xs text-sys-muted">Tipp: gleiches Licht, gleicher Ort, gleiche Uhrzeit.</p>
        </div>
      </SystemWindow>

      {sorted.length === 2 && (
        <SystemWindow title="Vergleich">
          <div className="grid grid-cols-2 gap-2">
            {sorted.map((p) => (
              <Photo key={p.id} photo={p} />
            ))}
          </div>
          <p className="mt-2 text-center text-sm text-sys-glow">
            {differenceInCalendarDays(sorted[1].createdAt, sorted[0].createdAt)} Tage dazwischen
          </p>
        </SystemWindow>
      )}

      {sorted.length === 1 && (
        <SystemWindow title="Foto">
          <Photo photo={sorted[0]} />
          <p className="mt-2 text-center text-xs text-sys-muted">Wähle ein zweites Foto zum Vergleichen.</p>
          <Button variant="danger" className="mt-3 w-full" onClick={() => setConfirmDelete(true)}>
            Foto löschen
          </Button>
        </SystemWindow>
      )}

      <SystemWindow title="Verlauf">
        <Chips options={FILTERS} value={filter} onChange={setFilter} />
        {photos && !shown.length && <p className="mt-3 text-center text-sys-muted">Noch keine Fotos.</p>}
        <div className="mt-3 grid grid-cols-3 gap-2">
          {shown.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => toggle(p.id)}
              className={`relative overflow-hidden rounded-xl border ${
                selected.includes(p.id) ? 'border-sys-glow shadow-glow' : 'border-sys-line'
              }`}
            >
              <Thumb photo={p} />
              {selected.includes(p.id) && (
                <span className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-sys-glow text-xs text-sys-bg">
                  ✓
                </span>
              )}
            </button>
          ))}
        </div>
      </SystemWindow>

      <Dialog open={confirmDelete} onClose={() => setConfirmDelete(false)} title="Foto löschen?">
        <p className="mb-3 text-sys-muted">Das Foto wird endgültig gelöscht.</p>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="ghost" onClick={() => setConfirmDelete(false)}>
            Nein
          </Button>
          <Button
            variant="danger"
            onClick={async () => {
              await deletePhoto(sorted[0].id)
              setSelected([])
              setConfirmDelete(false)
            }}
          >
            Löschen
          </Button>
        </div>
      </Dialog>
    </div>
  )
}

function Thumb({ photo }: { photo: PhotoRecord }) {
  const url = useObjectUrl(photo.blob)
  return (
    <>
      {url && <img src={url} alt="" className="aspect-[3/4] w-full object-cover" />}
      <span className="absolute inset-x-0 bottom-0 bg-black/60 py-0.5 text-center text-[10px]">
        {format(photo.createdAt, 'd.M.yy')} · {photo.pose}
      </span>
    </>
  )
}

function Photo({ photo }: { photo: PhotoRecord }) {
  const url = useObjectUrl(photo.blob)
  return (
    <figure>
      {url && <img src={url} alt="" className="w-full rounded-xl border border-sys-line" />}
      <figcaption className="mt-1 text-center text-xs text-sys-muted">
        {format(photo.createdAt, 'd.M.yyyy')} · {photo.pose}
      </figcaption>
    </figure>
  )
}
