import type { E1rmPoint, HistoryBestSet } from '@sheetless/domain/history/types'

/**
 * A record as the e1RM point its estimate came from, so `buildE1rmTrace` can explain it.
 *
 * Null for a bodyweight record: there is no external load to put through the formula, and a trace
 * that substituted zero would claim an estimate the app never made.
 */
export function bestSetAsE1rmPoint(set: HistoryBestSet): E1rmPoint | null {
  if (set.load == null || set.load <= 0 || !set.reps || !set.performedAt) return null
  return {
    date: set.performedAt,
    sessionId: set.sessionId,
    e1rm: set.e1rm ?? 0,
    load: set.load,
    reps: set.reps,
    rir: set.rir ?? null,
    outlier: false,
  }
}
