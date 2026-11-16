import { useState } from 'react'
import { differenceInCalendarDays, format } from 'date-fns'
import { PinGate } from '../components/PinGate'
import { BossList } from '../components/BossList'
import { SkinRoutines } from '../components/SkinRoutines'
import { Button, Chips, Dialog, PhotoCapture, Rating, Slider, SystemWindow } from '../components/ui'
import { XP } from '../config/xp'
import type { PhotoRecord } from '../db/db'
import { deletePhoto, useObjectUrl } from '../lib/photos'
import { addSkinPhoto, rateSkin, useSkinPhotos, useSkinRating } from '../lib/skin'

const LABELS = ['', 'Schlecht', 'Eher schlecht', 'Okay', 'Gut', 'Sehr gut']

export function SkinPage() {
  const rating = useSkinRating()
  return (
    <div className="space-y-4">
      <SkinRoutines />
      <SystemWindow title="Hautzustand heute">
        <Rating value={rating ?? 0} onChange={rateSkin} />
        <p className="mt-2 text-center text-xs text-sys-muted">{rating ? LABELS[rating] : 'Wie sieht deine Haut heute aus?'}</p>
      </SystemWindow>
      <SystemWindow title="Pflege- und Habit-Bosse">
        <BossList only="routine" />
      </SystemWindow>
      <PinGate>
        <SkinPhotos />
      </PinGate>
    </div>
  )
}

const MODES = ['Nebeneinander', 'Schieberegler'] as const

function SkinPhotos() {
  const photos = useSkinPhotos()
  const [selected, setSelected] = useState<number[]>([])
  const [mode, setMode] = useState<(typeof MODES)[number]>('Schieberegler')
  const [split, setSplit] = useState(50)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const picked = selected.map((id) => photos?.find((p) => p.id === id)).filter(Boolean) as PhotoRecord[]
  const sorted = [...picked].sort((a, b) => a.createdAt - b.createdAt)

  const toggle = (id: number) =>
    setSelected(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected.slice(-1), id])

  return (
    <>
      <SystemWindow title="Hautfotos">
        <div className="grid">
          <PhotoCapture onCapture={addSkinPhoto} />
        </div>
        <p className="mt-2 text-center text-xs text-sys-muted">
          +{XP.skin_photo} XP (Charisma), einmal am Tag. Tipp: gleiches Licht, gleicher Abstand.
        </p>
      </SystemWindow>

      {sorted.length === 2 && (
        <SystemWindow title="Vergleich">
          <Chips options={MODES} value={mode} onChange={setMode} />
          <div className="mt-3">
            {mode === 'Nebeneinander' ? (
              <div className="grid grid-cols-2 gap-2">
                {sorted.map((p) => (
                  <Photo key={p.id} photo={p} />
                ))}
              </div>
            ) : (
              <Overlay before={sorted[0]} after={sorted[1]} split={split} />
            )}
          </div>
          {mode === 'Schieberegler' && <Slider value={split} onChange={setSplit} />}
          <p className="mt-2 text-center text-sm text-sys-glow">
            {format(sorted[0].createdAt, 'd.M.yy')} → {format(sorted[1].createdAt, 'd.M.yy')} ·{' '}
            {differenceInCalendarDays(sorted[1].createdAt, sorted[0].createdAt)} Tage
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
        {photos && !photos.length && <p className="text-center text-sys-muted">Noch keine Hautfotos.</p>}
        <div className="grid grid-cols-3 gap-2">
          {photos?.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => toggle(p.id)}
              className={`relative overflow-hidden rounded-xl border ${selected.includes(p.id) ? 'border-sys-glow shadow-glow' : 'border-sys-line'}`}
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
    </>
  )
}

function Overlay({ before, after, split }: { before: PhotoRecord; after: PhotoRecord; split: number }) {
  const a = useObjectUrl(before.blob)
  const b = useObjectUrl(after.blob)
  return (
    <div className="relative overflow-hidden rounded-xl border border-sys-line">
      {b && <img src={b} alt="" className="block w-full" />}
      {a && (
        <img src={a} alt="" className="absolute inset-0 h-full w-full object-cover" style={{ clipPath: `inset(0 ${100 - split}% 0 0)` }} />
      )}
      <div className="absolute inset-y-0 w-0.5 bg-sys-glow shadow-glow" style={{ left: `${split}%` }} />
      <span className="absolute top-1 left-1 rounded bg-black/60 px-1 text-[10px]">vorher</span>
      <span className="absolute top-1 right-1 rounded bg-black/60 px-1 text-[10px]">nachher</span>
    </div>
  )
}

function Thumb({ photo }: { photo: PhotoRecord }) {
  const url = useObjectUrl(photo.blob)
  return (
    <>
      {url && <img src={url} alt="" className="aspect-[3/4] w-full object-cover" />}
      <span className="absolute inset-x-0 bottom-0 bg-black/60 py-0.5 text-center text-[10px]">{format(photo.createdAt, 'd.M.yy')}</span>
    </>
  )
}

function Photo({ photo }: { photo: PhotoRecord }) {
  const url = useObjectUrl(photo.blob)
  return (
    <figure>
      {url && <img src={url} alt="" className="w-full rounded-xl border border-sys-line" />}
      <figcaption className="mt-1 text-center text-xs text-sys-muted">{format(photo.createdAt, 'd.M.yyyy')}</figcaption>
    </figure>
  )
}
