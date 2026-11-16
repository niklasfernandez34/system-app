import { format } from 'date-fns'
import JSZip from 'jszip'
import { db, type FileRecord, type PhotoRecord } from '../db/db'
import { setSetting } from '../db/settings'

const BACKUP_VERSION = 9
export const DATA_TABLES = ['events', 'settings', 'habits', 'journal', 'notes', 'exercises', 'plans', 'workouts', 'body', 'quests', 'ranks', 'bosses', 'foods', 'meals', 'water', 'recipes', 'subjects', 'todos', 'cards', 'sheets', 'studyPlans', 'links', 'drawings', 'skinSteps'] as const

export type PhotoMeta = Omit<PhotoRecord, 'blob'>
export type FileMeta = Omit<FileRecord, 'blob'>
export type Snapshot = Record<string, unknown> & { app: 'system-app'; version: number; photosMeta: PhotoMeta[]; filesMeta: FileMeta[] }

export const photoKey = (p: Pick<PhotoRecord, 'id' | 'createdAt'>) => `photo-${p.id}-${p.createdAt}`
export const fileKey = (f: Pick<FileRecord, 'id' | 'createdAt'>) => `file-${f.id}-${f.createdAt}`

export async function saveFile(blob: Blob, name: string) {
  const file = new File([blob], name, { type: blob.type })
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file] })
      return
    } catch (e) {
      if ((e as Error).name === 'AbortError') return
    }
  }
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

const withType = (blob: Blob, type: string) => (blob.type === type ? blob : new Blob([blob], { type }))

export async function repairBlobTypes() {
  const photos = (await db.photos.toArray()).filter((p) => !p.blob.type.startsWith('image/'))
  for (const p of photos) await db.photos.update(p.id, { blob: withType(p.blob, 'image/jpeg') })
  const files = (await db.files.toArray()).filter((f) => f.type && f.blob.type !== f.type)
  for (const f of files) await db.files.update(f.id, { blob: withType(f.blob, f.type) })
}

export async function snapshotData(): Promise<Snapshot> {
  const tables = Object.fromEntries(await Promise.all(DATA_TABLES.map(async (t) => [t, await db.table(t).toArray()])))
  const photosMeta = (await db.photos.toArray()).map(({ blob: _b, ...m }) => m)
  const filesMeta = (await db.files.toArray()).filter((f) => !f.noSync).map(({ blob: _b, ...m }) => m)
  return { app: 'system-app', version: BACKUP_VERSION, schema: db.verno, exportedAt: new Date().toISOString(), ...tables, photosMeta, filesMeta }
}

export function isSnapshot(p: unknown): p is Snapshot {
  const s = p as Snapshot
  return s?.app === 'system-app' && Array.isArray(s.events) && Array.isArray(s.settings)
}

export async function missingBlobs(snap: Snapshot) {
  const have = new Set([...(await db.photos.toArray()).map(photoKey), ...(await db.files.toArray()).map(fileKey)])
  return [...snap.photosMeta.map(photoKey), ...snap.filesMeta.map(fileKey)].filter((k) => !have.has(k))
}

export async function applyData(snap: Snapshot, blobs: Map<string, Blob>) {
  const localPhotos = new Map((await db.photos.toArray()).map((p) => [photoKey(p), p.blob]))
  const localFiles = await db.files.toArray()
  const localFileBlobs = new Map(localFiles.map((f) => [fileKey(f), f.blob]))
  const photos: PhotoRecord[] = []
  for (const m of snap.photosMeta ?? []) {
    const blob = blobs.get(photoKey(m)) ?? localPhotos.get(photoKey(m))
    if (blob) photos.push({ ...m, blob: withType(blob, 'image/jpeg') })
  }
  const files: FileRecord[] = []
  for (const m of snap.filesMeta ?? []) {
    const blob = blobs.get(fileKey(m)) ?? localFileBlobs.get(fileKey(m))
    if (blob) files.push({ ...m, blob: withType(blob, m.type) })
  }
  const keepLocal = localFiles.filter((f) => f.noSync).map(({ id: _id, ...rest }) => rest)
  const tables = [...DATA_TABLES.map((t) => db.table(t)), db.photos, db.files]
  await db.transaction('rw', tables, async () => {
    for (const t of DATA_TABLES) {
      await db.table(t).clear()
      await db.table(t).bulkAdd(Array.isArray(snap[t]) ? (snap[t] as object[]) : [])
    }
    await db.photos.clear()
    await db.photos.bulkAdd(photos)
    await db.files.clear()
    await db.files.bulkAdd(files)
    for (const f of keepLocal) await db.files.add(f as FileRecord)
  })
}

export async function exportBackup() {
  const snap = await snapshotData()
  const zip = new JSZip()
  zip.file('data.json', JSON.stringify(snap))
  for (const p of await db.photos.toArray()) zip.file(`blobs/${photoKey(p)}`, p.blob)
  for (const f of await db.files.toArray()) if (!f.noSync) zip.file(`blobs/${fileKey(f)}`, f.blob)
  const blob = await zip.generateAsync({ type: 'blob', mimeType: 'application/zip' })
  await saveFile(blob, `System-Backup ${format(new Date(), 'yyyy-MM-dd HH-mm')}.zip`)
  await setSetting('lastBackupAt', Date.now())
}

export async function importBackup(file: File) {
  if (file.name.endsWith('.json') || file.type === 'application/json') return importLegacyData(file)
  const zip = await JSZip.loadAsync(file)
  const dataFile = zip.file('data.json')
  if (!dataFile) {
    if (zip.file('fotos.json')) return importLegacyPhotos(zip)
    throw new Error('Keine gültige Backup-Datei.')
  }
  const snap = JSON.parse(await dataFile.async('string'))
  if (!isSnapshot(snap)) throw new Error('Keine gültige Backup-Datei.')
  const blobs = new Map<string, Blob>()
  for (const [path, entry] of Object.entries(zip.files)) {
    if (!path.startsWith('blobs/') || entry.dir) continue
    blobs.set(path.slice(6), new Blob([await entry.async('arraybuffer')]))
  }
  await applyData(snap, blobs)
}

async function importLegacyData(file: File) {
  const payload = JSON.parse(await file.text())
  if (!isSnapshot({ ...payload, app: payload?.app })) throw new Error('Keine gültige Backup-Datei.')
  const tables = DATA_TABLES.map((t) => db.table(t))
  await db.transaction('rw', tables, async () => {
    for (const t of tables) {
      await t.clear()
      await t.bulkAdd(Array.isArray(payload[t.name]) ? payload[t.name] : [])
    }
  })
}

async function importLegacyPhotos(zip: JSZip) {
  const meta = JSON.parse(await zip.file('fotos.json')!.async('string')) as { photos: PhotoMeta[]; files?: FileMeta[] }
  const photos: PhotoRecord[] = []
  for (const m of meta.photos) {
    const entry = zip.file(`fotos/${m.id}.jpg`)
    if (entry) photos.push({ ...m, blob: new Blob([await entry.async('arraybuffer')], { type: 'image/jpeg' }) })
  }
  const files: FileRecord[] = []
  for (const m of meta.files ?? []) {
    const entry = zip.file(`dateien/${m.id}`)
    if (entry) files.push({ ...m, blob: new Blob([await entry.async('arraybuffer')], { type: m.type }) })
  }
  await db.transaction('rw', db.photos, db.files, async () => {
    await db.photos.clear()
    await db.photos.bulkAdd(photos)
    if (meta.files) {
      await db.files.clear()
      await db.files.bulkAdd(files)
    }
  })
}
