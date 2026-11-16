import { useSyncExternalStore } from 'react'
import { db } from '../db/db'
import { applyData, fileKey, isSnapshot, missingBlobs, photoKey, snapshotData, type Snapshot } from './backup'
import { ConflictError, dropboxRemote, type DropboxAuth, type Remote } from './dropbox'
import { decide } from './syncDecide'

const KEY = 'system-sync'
const DATA = '/data.json'
const BLOBS = '/blobs'

type Stored = { auth?: DropboxAuth; lastRev?: string | null; lastHash?: string | null; lastSyncedAt?: number; verifier?: string; appKey?: string }
export type SyncStatus = {
  connected: boolean
  busy: boolean
  lastSyncedAt?: number
  error?: string
  conflict?: { remoteModified: string }
}

function load(): Stored {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '{}')
  } catch {
    return {}
  }
}

function save(patch: Partial<Stored>) {
  const next = { ...load(), ...patch }
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    return next
  }
  return next
}

let status: SyncStatus = { connected: !!load().auth, busy: false, lastSyncedAt: load().lastSyncedAt }
const listeners = new Set<() => void>()
const emit = (patch: Partial<SyncStatus>) => {
  status = { ...status, ...patch }
  listeners.forEach((l) => l())
}

export function useSyncStatus() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => status,
  )
}

export const isConnected = () => !!load().auth
export const pendingAuth = () => load()
export const rememberAuthStart = (appKey: string, verifier: string) => save({ appKey, verifier })

let override: Remote | null = null
export const setTestRemote = (r: Remote | null) => {
  override = r
  emit({ connected: !!r || isConnected() })
}

function remote(): Remote | null {
  if (override) return override
  const auth = load().auth
  return auth ? dropboxRemote(auth, (a) => save({ auth: a })) : null
}

export function connect(auth: DropboxAuth) {
  save({ auth, lastRev: null, lastHash: null, verifier: undefined })
  emit({ connected: true, error: undefined })
}

export function disconnect() {
  try {
    localStorage.removeItem(KEY)
  } catch {
    return
  }
  emit({ connected: false, lastSyncedAt: undefined, conflict: undefined, error: undefined })
}

async function hashOf(snap: Snapshot) {
  const { exportedAt: _e, ...rest } = snap
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(rest)))
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('')
}

let running: Promise<void> | null = null

export function syncNow(opts: { resolve?: 'local' | 'remote'; signal?: AbortSignal } = {}) {
  if (running) return running
  running = run(opts).finally(() => (running = null))
  return running
}

async function run({ resolve, signal }: { resolve?: 'local' | 'remote'; signal?: AbortSignal }) {
  const r = remote()
  if (!r || (status.conflict && !resolve)) return
  if (!navigator.onLine) return emit({ error: 'Offline – Sync folgt später.' })
  emit({ busy: true, error: undefined })
  try {
    const st = load()
    const meta = await r.meta(DATA, signal)
    const local = await snapshotData()
    const localHash = await hashOf(local)
    const action = resolve
      ? resolve === 'local'
        ? 'upload'
        : 'download'
      : decide({ remoteRev: meta?.rev ?? null, lastRev: st.lastRev ?? null, localHash, lastHash: st.lastHash ?? null })

    if (action === 'conflict') return emit({ conflict: { remoteModified: meta!.modified } })

    if (action === 'download' && meta) {
      const snap = JSON.parse(await (await r.download(DATA, signal)).text())
      if (!isSnapshot(snap)) throw new Error('Dropbox-Stand ist beschädigt.')
      const blobs = new Map<string, Blob>()
      for (const key of await missingBlobs(snap)) {
        try {
          blobs.set(key, await r.download(`${BLOBS}/${key}`, signal))
        } catch {
          continue
        }
      }
      if (signal?.aborted) return
      await applyData(snap, blobs)
      save({ lastRev: meta.rev, lastHash: await hashOf(await snapshotData()), lastSyncedAt: Date.now() })
    }

    if (action === 'upload') {
      const have = new Set(await r.list(BLOBS, signal))
      const want = new Set<string>()
      for (const p of await db.photos.toArray()) {
        const k = photoKey(p)
        want.add(k)
        if (!have.has(k)) await r.upload(`${BLOBS}/${k}`, p.blob, null, signal)
      }
      for (const f of await db.files.toArray()) {
        if (f.noSync) continue
        const k = fileKey(f)
        want.add(k)
        if (!have.has(k)) await r.upload(`${BLOBS}/${k}`, f.blob, null, signal)
      }
      const rev = await r.upload(DATA, JSON.stringify(local), resolve === 'local' ? null : (meta?.rev ?? null), signal)
      save({ lastRev: rev, lastHash: localHash, lastSyncedAt: Date.now() })
      for (const k of have) if (!want.has(k)) await r.remove(`${BLOBS}/${k}`).catch(() => undefined)
    }

    if (action === 'none') save({ lastSyncedAt: Date.now() })
    emit({ conflict: undefined, lastSyncedAt: load().lastSyncedAt })
  } catch (e) {
    if (e instanceof ConflictError) return emit({ conflict: { remoteModified: new Date().toISOString() } })
    if ((e as Error).name === 'AbortError') return
    emit({ error: (e as Error).message })
  } finally {
    emit({ busy: false })
  }
}

export async function syncOnOpen(timeoutMs = 10000) {
  if (!remote()) return
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    await syncNow({ signal: ctrl.signal })
  } finally {
    clearTimeout(t)
  }
}

export async function usage() {
  const r = remote()
  return r ? r.usage() : null
}
