export type SyncAction = 'none' | 'upload' | 'download' | 'conflict'

export function decide(s: { remoteRev: string | null; lastRev: string | null; localHash: string; lastHash: string | null }): SyncAction {
  if (!s.remoteRev) return 'upload'
  if (s.remoteRev === s.lastRev) return s.localHash === s.lastHash ? 'none' : 'upload'
  if (s.lastRev && s.localHash === s.lastHash) return 'download'
  return 'conflict'
}
