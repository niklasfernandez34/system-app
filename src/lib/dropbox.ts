export type RemoteMeta = { rev: string; modified: string }

export type Remote = {
  meta(path: string, signal?: AbortSignal): Promise<RemoteMeta | null>
  list(folder: string, signal?: AbortSignal): Promise<string[]>
  download(path: string, signal?: AbortSignal): Promise<Blob>
  upload(path: string, data: Blob | string, rev?: string | null, signal?: AbortSignal): Promise<string>
  remove(path: string): Promise<void>
  usage(): Promise<{ used: number; allocated: number }>
}

export type DropboxAuth = { appKey: string; refreshToken: string; accessToken?: string; expiresAt?: number }

const API = 'https://api.dropboxapi.com/2'
const CONTENT = 'https://content.dropboxapi.com/2'
const TOKEN = 'https://api.dropboxapi.com/oauth2/token'

export class ConflictError extends Error {}

const b64url = (buf: ArrayBuffer) =>
  btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')

export async function startAuth(appKey: string) {
  const verifier = b64url(crypto.getRandomValues(new Uint8Array(48)).buffer)
  const challenge = b64url(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier)))
  const url = new URL('https://www.dropbox.com/oauth2/authorize')
  url.search = new URLSearchParams({
    client_id: appKey,
    response_type: 'code',
    code_challenge: challenge,
    code_challenge_method: 'S256',
    token_access_type: 'offline',
  }).toString()
  return { verifier, url: url.toString() }
}

export async function finishAuth(appKey: string, code: string, verifier: string): Promise<DropboxAuth> {
  const res = await fetch(TOKEN, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ code: code.trim(), grant_type: 'authorization_code', client_id: appKey, code_verifier: verifier }),
  })
  if (!res.ok) throw new Error('Der Code wurde nicht angenommen. Bitte neu anmelden.')
  const t = await res.json()
  return { appKey, refreshToken: t.refresh_token, accessToken: t.access_token, expiresAt: Date.now() + (t.expires_in - 60) * 1000 }
}

const ascii = (o: object) => JSON.stringify(o).replace(/[\u007f-￿]/g, (c) => `\\u${c.charCodeAt(0).toString(16).padStart(4, '0')}`)

export function dropboxRemote(auth: DropboxAuth, onAuth: (a: DropboxAuth) => void): Remote {
  const token = async () => {
    if (auth.accessToken && (auth.expiresAt ?? 0) > Date.now()) return auth.accessToken
    const res = await fetch(TOKEN, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: auth.refreshToken, client_id: auth.appKey }),
    })
    if (!res.ok) throw new Error('Dropbox-Anmeldung abgelaufen. Bitte neu verbinden.')
    const t = await res.json()
    auth = { ...auth, accessToken: t.access_token, expiresAt: Date.now() + (t.expires_in - 60) * 1000 }
    onAuth(auth)
    return auth.accessToken!
  }

  const rpc = async (endpoint: string, body?: object, signal?: AbortSignal) => {
    const res = await fetch(`${API}${endpoint}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${await token()}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
      body: body ? JSON.stringify(body) : undefined,
      signal,
    })
    if (res.status === 409) return { notFound: (await res.text()).includes('not_found') }
    if (!res.ok) throw new Error(`Dropbox-Fehler ${res.status}`)
    return res.json()
  }

  return {
    async meta(path, signal) {
      const r = await rpc('/files/get_metadata', { path }, signal)
      return r.notFound ? null : { rev: r.rev, modified: r.server_modified }
    },
    async list(folder, signal) {
      const names: string[] = []
      let r = await rpc('/files/list_folder', { path: folder }, signal)
      if (r.notFound) return names
      for (;;) {
        for (const e of r.entries) if (e['.tag'] === 'file') names.push(e.name)
        if (!r.has_more) return names
        r = await rpc('/files/list_folder/continue', { cursor: r.cursor }, signal)
      }
    },
    async download(path, signal) {
      const res = await fetch(`${CONTENT}/files/download`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${await token()}`, 'Dropbox-API-Arg': ascii({ path }) },
        signal,
      })
      if (!res.ok) throw new Error(`Download fehlgeschlagen (${res.status})`)
      return res.blob()
    },
    async upload(path, data, rev, signal) {
      const mode = rev ? { '.tag': 'update', update: rev } : 'overwrite'
      const res = await fetch(`${CONTENT}/files/upload`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${await token()}`,
          'Dropbox-API-Arg': ascii({ path, mode, mute: true }),
          'Content-Type': 'application/octet-stream',
        },
        body: data,
        signal,
      })
      if (res.status === 409) throw new ConflictError('Dropbox-Stand hat sich geändert.')
      if (!res.ok) throw new Error(`Upload fehlgeschlagen (${res.status})`)
      return (await res.json()).rev
    },
    async remove(path) {
      await rpc('/files/delete_v2', { path })
    },
    async usage() {
      const r = await rpc('/users/get_space_usage')
      return { used: r.used, allocated: r.allocation?.allocated ?? 0 }
    },
  }
}
