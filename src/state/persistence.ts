// Local durable cache (IndexedDB via idb-keyval). Tier 1 of the sync model.

import { get, set, del } from 'idb-keyval'
import type { AppState } from './types'
import { parseState } from './schema'

const KEY = 'wc-state-v1'
const BACKUPS_KEY = 'wc-state-backups'
const MAX_BACKUPS = 5

export async function loadState(): Promise<AppState | null> {
  try {
    const raw = await get(KEY)
    if (raw == null) return null
    return parseState(raw)
  } catch {
    return null
  }
}

export async function saveState(state: AppState): Promise<void> {
  await set(KEY, state)
}

/** Keep a small ring buffer of prior docs as a manual-recovery safety net. */
export async function pushBackup(state: AppState): Promise<void> {
  try {
    const arr = ((await get<AppState[]>(BACKUPS_KEY)) ?? []).slice()
    arr.push(state)
    while (arr.length > MAX_BACKUPS) arr.shift()
    await set(BACKUPS_KEY, arr)
  } catch {
    // best effort
  }
}

export async function clearState(): Promise<void> {
  await del(KEY)
}
