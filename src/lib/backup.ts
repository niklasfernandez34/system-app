import { format } from 'date-fns'
import JSZip from 'jszip'
import { db, type PhotoRecord } from '../db/db'
import { setSetting } from '../db/settings'

const BACKUP_VERSION = 1

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
    events: await db.events.toArray(),
    settings: await db.settings.toArray(),
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
  await db.transaction('rw', db.events, db.settings, async () => {
    await db.events.clear()
    await db.settings.clear()
    await db.events.bulkAdd(payload.events)
    await db.settings.bulkAdd(payload.settings)
  })
}

export async function exportPhotos() {
  const photos = await db.photos.toArray()
  const zip = new JSZip()
  const meta = photos.map(({ blob, ...rest }) => {
    zip.file(`fotos/${rest.id}.jpg`, blob)
    return rest
  })
  zip.file('fotos.json', JSON.stringify({ app: 'system-app', version: BACKUP_VERSION, photos: meta }))
  const blob = await zip.generateAsync({ type: 'blob', mimeType: 'application/zip' })
  await saveFile(blob, `system-fotos_${stamp()}.zip`)
  return photos.length
}

export async function importPhotos(file: File) {
  const zip = await JSZip.loadAsync(file)
  const metaFile = zip.file('fotos.json')
  if (!metaFile) throw new Error('Keine gültige Foto-Backup-Datei.')
  const meta = JSON.parse(await metaFile.async('string')) as { photos: Omit<PhotoRecord, 'blob'>[] }
  const records: PhotoRecord[] = []
  for (const m of meta.photos) {
    const entry = zip.file(`fotos/${m.id}.jpg`)
    if (!entry) continue
    const data = await entry.async('arraybuffer')
    records.push({ ...m, blob: new Blob([data], { type: 'image/jpeg' }) })
  }
  await db.transaction('rw', db.photos, async () => {
    await db.photos.clear()
    await db.photos.bulkAdd(records)
  })
  return records.length
}
