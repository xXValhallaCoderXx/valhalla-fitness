import { describe, expect, it } from 'vitest'
import { bestSetAsE1rmPoint } from '@sheetless/domain/history/records-trace'
import { buildE1rmTrace } from '@sheetless/domain/history/e1rm-trace'
import type { HistoryBestSet } from '@sheetless/domain/history/types'

const loaded: HistoryBestSet = {
  id: 'bs-1',
  movementId: 'deadlift',
  movementName: 'Deadlift',
  role: 'main',
  type: 'top_set',
  load: 167.5,
  reps: 5,
  rir: 2,
  e1rm: 206.6,
  sessionId: 'sess-1',
  sessionTitle: 'Pull day',
  performedAt: '2026-07-22',
  units: 'kg',
}

describe('bestSetAsE1rmPoint', () => {
  it('carries the set the record was made on', () => {
    expect(bestSetAsE1rmPoint(loaded)).toMatchObject({
      date: '2026-07-22',
      sessionId: 'sess-1',
      load: 167.5,
      reps: 5,
      rir: 2,
      outlier: false,
    })
  })

  // A bodyweight record has no external load to put through the formula; substituting zero would
  // claim an estimate the app never made.
  it('declines a record with nothing to derive from', () => {
    expect(bestSetAsE1rmPoint({ ...loaded, load: null })).toBeNull()
    expect(bestSetAsE1rmPoint({ ...loaded, load: 0 })).toBeNull()
    expect(bestSetAsE1rmPoint({ ...loaded, reps: null })).toBeNull()
    expect(bestSetAsE1rmPoint({ ...loaded, performedAt: null })).toBeNull()
  })

  it('produces a trace that agrees with the record it explains', () => {
    const point = bestSetAsE1rmPoint(loaded)!
    const trace = buildE1rmTrace({ point, movementName: 'Deadlift', units: 'kg' })
    expect(trace.matchesPlannedLoad).toBe(true)
  })
})
