import { useLiveQuery } from 'dexie-react-hooks'
import { Dialog } from './ui'
import { db } from '../db/db'
import { useWger } from '../lib/wger'

type Props = { exerciseId: number | null; onClose: () => void }

export function ExerciseInfo({ exerciseId, onClose }: Props) {
  const exercise = useLiveQuery(() => (exerciseId ? db.exercises.get(exerciseId) : undefined), [exerciseId])
  const wger = useWger()
  const info = exercise?.wgerId ? wger?.find((w) => w.id === exercise.wgerId) : undefined

  return (
    <Dialog open={exerciseId !== null} onClose={onClose} title={exercise?.name}>
      {exercise && (
        <div className="max-h-[70vh] space-y-3 overflow-y-auto text-sm">
          {info?.image && (
            <img
              src={info.image}
              alt={info.name}
              loading="lazy"
              className="mx-auto max-h-56 rounded-xl bg-white object-contain"
            />
          )}
          <p>
            <span className="text-sys-muted">Gruppe: </span>
            {exercise.muscle}
          </p>
          {info && info.muscles.length > 0 && (
            <p>
              <span className="text-sys-muted">Muskeln: </span>
              {info.muscles.join(', ')}
              {info.secondary.length > 0 && <span className="text-sys-muted"> (+ {info.secondary.join(', ')})</span>}
            </p>
          )}
          {info && info.equipment.length > 0 && (
            <p>
              <span className="text-sys-muted">Geräte: </span>
              {info.equipment.join(', ')}
            </p>
          )}
          {!info && exercise.equipment && (
            <p>
              <span className="text-sys-muted">Gerät: </span>
              {exercise.equipment}
            </p>
          )}
          {info?.description && <p className="leading-relaxed">{info.description}</p>}
          <p className="border-t border-sys-line pt-2 text-xs text-sys-muted">
            {info ? `Quelle: wger.de · ${info.author} · CC-BY-SA` : 'Eigene Übung'}
          </p>
        </div>
      )}
    </Dialog>
  )
}
