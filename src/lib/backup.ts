import { format } from 'date-fns'
import JSZip from 'jszip'
import { db, type FileRecord, type PhotoRecord } from '../db/db'
import { setSetting } from '../db/settings'

const BACKUP_VERSION = 8
const DATA_TABLES = ['events', 'settings', 'habits', 'journal', 'notes', 'exercises', 'plans', 'workouts', 'body', 'quests', 'ranks', 'bosses', 'foods', 'meals', 'water', 'recipes', 'subjects', 'todos', 'cards', 'sheets', 'studyPlans', 'links'] as const

async function saveFile(blob: Blob, name: string) {
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

const stamp = () => format(new Date(), 'yyyy-MM-dd_HH-mm')

export async function exportData() {
  const payload = {
    app: 'system-app',
    version: BACKUP_VERSION,
    schema: db.verno,
    exportedAt: new Date().toISOString(),
    ...Object.fromEntries(await Promise.all(DATA_TABLES.map(async (t) => [t, await db.table(t).toArray()]))),
  }
  const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' })
  await saveFile(blob, `system-daten_${stamp()}.json`)
  await setSetting('lastBackupAt', Date.now())
}

export async function importData(file: File) {
  const payload = JSON.parse(await file.text())
  if (payload?.app !== 'system-app' || !Array.isArray(payload.events) || !Array.isArray(payload.settings)) {
    throw new Error('Keine gültige Backup-Datei.')
  }
  const tables = DATA_TABLES.map((t) => db.table(t))
  await db.transaction('rw', tables, async () => {
    for (const t of tables) {
      await t.clear()
      await t.bulkAdd(Array.isArray(payload[t.name]) ? payload[t.name] : [])
    }
  })
}

export async function exportPhotos() {
  const photos = await db.photos.toArray()
  const files = await db.files.toArray()
  const zip = new JSZip()
  const meta = photos.map(({ blob, ...rest }) => {
    zip.file(`fotos/${rest.id}.jpg`, blob)
    return rest
  })
  const fileMeta = files.map(({ blob, ...rest }) => {
    zip.file(`dateien/${rest.id}`, blob)
    return rest
  })
  zip.file('fotos.json', JSON.stringify({ app: 'system-app', version: BACKUP_VERSION, photos: meta, files: fileMeta }))
  const blob = await zip.generateAsync({ type: 'blob', mimeType: 'application/zip' })
  await saveFile(blob, `system-fotos_${stamp()}.zip`)
  return photos.length + files.length
}

export async function importPhotos(file: File) {
  const zip = await JSZip.loadAsync(file)
  const metaFile = zip.file('fotos.json')
  if (!metaFile) throw new Error('Keine gültige Foto-Backup-Datei.')
  const meta = JSON.parse(await metaFile.async('string')) as {
    photos: Omit<PhotoRecord, 'blob'>[]
    files?: Omit<FileRecord, 'blob'>[]
  }
  const records: PhotoRecord[] = []
  for (const m of meta.photos) {
    const entry = zip.file(`fotos/${m.id}.jpg`)
    if (!entry) continue
    const data = await entry.async('arraybuffer')
    records.push({ ...m, blob: new Blob([data], { type: 'image/jpeg' }) })
  }
  const files: FileRecord[] = []
  for (const m of meta.files ?? []) {
    const entry = zip.file(`dateien/${m.id}`)
    if (!entry) continue
    const data = await entry.async('arraybuffer')
    files.push({ ...m, blob: new Blob([data], { type: m.type }) })
  }
  await db.transaction('rw', db.photos, db.files, async () => {
    await db.photos.clear()
    await db.photos.bulkAdd(records)
    if (meta.files) {
      await db.files.clear()
      await db.files.bulkAdd(files)
    }
  })
  return records.length + files.length
}
