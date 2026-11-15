import { useEffect, useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import { currentDay, logEvent } from './events'

export const POSES = ['Vorne', 'Seite', 'Hinten'] as const
export type Pose = (typeof POSES)[number]

export async function addProgressPhoto(blob: Blob, pose: Pose) {
  const day = await currentDay()
  const id = await db.photos.add({ kind: 'progress', createdAt: Date.now(), blob, day, pose } )
  await logEvent('progress_photo', { photoId: id, pose })
}

export function deletePhoto(id: number) {
  return db.photos.delete(id)
}

export function useProgressPhotos() {
  return useLiveQuery(() => db.photos.where('kind').equals('progress').reverse().sortBy('createdAt'))
}

export function useObjectUrl(blob: Blob | undefined) {
  const url = useMemo(() => (blob ? URL.createObjectURL(blob) : undefined), [blob])
  useEffect(() => () => { if (url) URL.revokeObjectURL(url) }, [url])
  return url
}
