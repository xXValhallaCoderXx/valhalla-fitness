import { describe, expect, it } from 'vitest'
import type { HistoryBestSet } from '@sheetless/domain/history/types'
import {
  formatBestSetPrimary,
  formatE1rm,
  hasDisplayE1rm,
} from '../src/domains/history/components/insight-format'

function bestSet(partial: Partial<HistoryBestSet> = {}): HistoryBestSet {
  return {
    id: 'set-1',
    movementId: 'chin_up',
    movementName: 'Chin-Up',
    role: 'accessory',
    type: 'accessory',
    load: null,
    reps: 10,
    e1rm: null,
    sessionId: 'session-1',
    sessionTitle: 'Workout',
    units: 'kg',
    ...partial,
  }
}

describe('history insight load formatting', () => {
  it.each([null, 0, -5])('renders load %s as bodyweight and suppresses stale e1RM', (load) => {
    const set = bestSet({ load, e1rm: 100 })

    expect(formatBestSetPrimary(set)).toBe('Bodyweight × 10 reps')
    expect(hasDisplayE1rm(set)).toBe(false)
    expect(formatE1rm(set)).toBe('—')
  })

  it('keeps positive weighted bodyweight records loaded', () => {
    const set = bestSet({ load: 10, e1rm: 13.5 })

    expect(formatBestSetPrimary(set)).toBe('10 kg × 10 reps')
    expect(hasDisplayE1rm(set)).toBe(true)
    expect(formatE1rm(set)).toBe('13.5 kg')
  })
})
