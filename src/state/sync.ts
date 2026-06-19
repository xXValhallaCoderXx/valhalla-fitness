export type SyncDecision = 'push' | 'pull' | 'noop'

export function chooseSyncDirection(localUpdatedAt: string, remoteUpdatedAt?: string | null): SyncDecision {
  if (!remoteUpdatedAt) return 'push'
  if (remoteUpdatedAt > localUpdatedAt) return 'pull'
  if (localUpdatedAt > remoteUpdatedAt) return 'push'
  return 'noop'
}
