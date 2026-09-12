import { describe, expect, it } from 'vitest'
import {
  buildTodayLedgerCaption,
  buildTodayLedgerRows,
  buildTodaySessionMeta,
  countPlannedSets,
  formatPreviousHero,
  formatPreviousLine,
  hasTargetLoads,
} from '@sheetless/domain/session/today-numbers'
import type { MovementSlot, PreviousComparable, SetLog } from '@sheetless/domain/session/types'

function set(setIndex: number, over: Partial<SetLog> = {}): SetLog {
  return { id: `set-${setIndex}`, setIndex, completed: false, ...over }
}

function movement(name: string, sets: SetLog[], over: Partial<MovementSlot> = {}): MovementSlot {
  return {
    id: `slot-${name}`,
    movementId: name.toLowerCase(),
    movementName: name,
    role: 'main',
    orderIndex: 0,
    targetSummary: `${sets.length}×? summary`,
    sets,
    ...over,
  }
}

const squat = movement('Squat', [
  set(1, { targetLoad: 62.5, targetReps: 5 }),
  set(2, { targetLoad: 62.5, targetReps: 5 }),
  set(3, { targetLoad: 62.5, targetReps: 5 }),
])

const press = movement('Overhead Press', [
  set(1, { targetLoad: 40, targetReps: 12 }),
  set(2, { targetLoad: 40, targetReps: 12 }),
])

const loadless = movement(
  'Chin-Up',
  [set(1, { targetRepMin: 6, targetRepMax: 10 }), set(2, { targetRepMin: 6, targetRepMax: 10 })],
  { role: 'accessory', targetSummary: '2 sets · 6-10 reps', previous: { movementId: 'chin-up', label: 'last: BW × 8' } },
)

describe('countPlannedSets / hasTargetLoads', () => {
  it('counts sets across movements', () => {
    expect(countPlannedSets({ movements: [squat, press, loadless] })).toBe(7)
    expect(countPlannedSets({ movements: [] })).toBe(0)
  })

  it('detects whether any set projects a load', () => {
    expect(hasTargetLoads({ movements: [squat, loadless] })).toBe(true)
    expect(hasTargetLoads({ movements: [loadless] })).toBe(false)
  })
})

describe('buildTodayLedgerRows', () => {
  it('renders a uniform loaded movement as "N × reps" plus a bold load target', () => {
    const [row] = buildTodayLedgerRows({ units: 'kg', movements: [squat] })
    expect(row).toMatchObject({
      movementName: 'Squat',
      role: 'main',
      setsLabel: '3 × 5',
      targetLabel: '62.5 kg',
      targetIsLoad: true,
    })
  })

  it('renders uniform rep ranges with an en dash and keeps a fixed load target', () => {
    const rowMovement = movement('Row', [
      set(1, { targetLoad: 40, targetRepMin: 6, targetRepMax: 10 }),
      set(2, { targetLoad: 40, targetRepMin: 6, targetRepMax: 10 }),
    ])
    const [row] = buildTodayLedgerRows({ units: 'kg', movements: [rowMovement] })
    expect(row.setsLabel).toBe('2 × 6–10')
    expect(row.targetLabel).toBe('40 kg')
  })

  it('falls back to a dimmed RIR cue when no set projects a load', () => {
    const accessory = movement(
      'Curl',
      [set(1, { targetRepMin: 8, targetRepMax: 12, targetRir: 2 }), set(2, { targetRepMin: 8, targetRepMax: 12, targetRir: 2 })],
      { role: 'accessory' },
    )
    const [row] = buildTodayLedgerRows({ units: 'kg', movements: [accessory] })
    expect(row).toMatchObject({ setsLabel: '2 × 8–12', targetLabel: 'RIR 2', targetIsLoad: false })
  })

  it('renders an explicit zero target as bodyweight, not 0 kg', () => {
    const bodyweight = movement('Chin-Up', [set(1, { targetLoad: 0, targetReps: 8 })])
    const [row] = buildTodayLedgerRows({ units: 'kg', movements: [bodyweight] })

    expect(hasTargetLoads({ movements: [bodyweight] })).toBe(false)
    expect(row).toMatchObject({ targetLabel: 'BW', targetIsLoad: false })
  })

  it('labels uniform AMRAP sets with a trailing plus', () => {
    const bench = movement('Bench', [
      set(1, { targetLoad: 100, targetReps: 5, isAmrap: true }),
      set(2, { targetLoad: 100, targetReps: 5, isAmrap: true }),
    ])
    expect(buildTodayLedgerRows({ units: 'kg', movements: [bench] })[0].setsLabel).toBe('2 × 5+')
  })

  it('collapses non-uniform waves to a set count and surfaces the top-set load', () => {
    const wave = movement('Deadlift', [
      set(1, { targetLoad: 140, targetReps: 5 }),
      set(2, { targetLoad: 150, targetReps: 3 }),
      set(3, { targetLoad: 160, targetReps: 1, isAmrap: true }),
    ])
    const [row] = buildTodayLedgerRows({ units: 'kg', movements: [wave] })
    expect(row).toMatchObject({ setsLabel: '3 sets', targetLabel: '160 kg', targetIsLoad: true })
  })

  it('renders em dashes when neither loads nor RIR are known, and for empty sets', () => {
    const unknown = movement('Mystery', [set(1, { targetRepMin: 8, targetRepMax: 12 })])
    const empty = movement('Empty', [])
    const rows = buildTodayLedgerRows({ units: 'kg', movements: [unknown, empty] })
    expect(rows[0]).toMatchObject({ setsLabel: '1 × 8–12', targetLabel: '—', targetIsLoad: false })
    expect(rows[1]).toMatchObject({ setsLabel: '—', targetLabel: '—', targetIsLoad: false })
  })

  it('reads only target fields, ignoring the planned-set actual* prefills', () => {
    const prefilled = movement('Squat', [
      set(1, { targetLoad: 100, targetReps: 5, actualLoad: 999, actualReps: 1 }),
      set(2, { targetLoad: 100, targetReps: 5, actualLoad: 999, actualReps: 1 }),
    ])
    const [row] = buildTodayLedgerRows({ units: 'kg', movements: [prefilled] })
    expect(row.setsLabel).toBe('2 × 5')
    expect(row.targetLabel).toBe('100 kg')
  })

  it('builds the history line from structured previous fields', () => {
    const withPrevious = movement('Squat', [set(1, { targetLoad: 100, targetReps: 5 })], {
      previous: { movementId: 'squat', label: 'server label', load: 107.5, reps: 6, rir: 3 },
    })
    expect(buildTodayLedgerRows({ units: 'kg', movements: [withPrevious] })[0].historyLine).toBe('107.5 × 6 @ RIR 3')
  })
})

describe('buildTodayLedgerCaption', () => {
  it('mentions target loads when any are projected', () => {
    expect(buildTodayLedgerCaption({ title: 'Day 2', movements: [squat] })).toBe('Day 2 target loads')
  })

  it('softens to plain targets when nothing projects a load', () => {
    expect(buildTodayLedgerCaption({ title: 'Day 2', movements: [loadless] })).toBe('Day 2 targets')
  })
})

describe('formatPreviousLine / formatPreviousHero', () => {
  const full: PreviousComparable = {
    movementId: 'squat',
    label: 'server label',
    load: 107.5,
    reps: 6,
    rir: 3,
    e1rm: 140,
    performedAt: '2026-07-03',
  }

  it('formats the unitless ledger line', () => {
    expect(formatPreviousLine(full)).toBe('107.5 × 6 @ RIR 3')
  })

  it('handles bodyweight and missing RIR', () => {
    expect(formatPreviousLine({ movementId: 'chin', label: '', reps: 8 })).toBe('BW × 8')
    expect(formatPreviousLine({ movementId: 'chin', label: '', load: 0, reps: 8 })).toBe('BW × 8')
    expect(formatPreviousLine({ movementId: 'squat', label: '', load: 100, reps: 5 })).toBe('100 × 5')
  })

  it('returns null when nothing comparable exists', () => {
    expect(formatPreviousLine(null)).toBeNull()
    expect(formatPreviousLine({ movementId: 'x', label: '' })).toBeNull()
  })

  it('formats the full hero line with units, e1RM, and a compact date', () => {
    expect(formatPreviousHero(full, 'kg')).toBe('Previous comparable · 107.5 kg × 6 @ RIR 3 · e1RM 140 kg · Jul 3')
  })

  it('omits hero parts that are unknown', () => {
    expect(formatPreviousHero({ movementId: 'squat', label: '', load: 100, reps: 5 }, 'kg')).toBe('Previous comparable · 100 kg × 5')
    expect(formatPreviousHero({ movementId: 'chin', label: '', load: 0, reps: 8, e1rm: 100 }, 'kg')).toBe('Previous comparable · BW × 8')
    expect(formatPreviousHero(null, 'kg')).toBeNull()
  })

  it('prefers the canonical workout date over the completion timestamp', () => {
    expect(formatPreviousHero({
      movementId: 'squat',
      label: '',
      load: 100,
      reps: 5,
      workoutDate: '2026-07-03',
      performedAt: '2026-07-04T00:30:00+08:00',
    }, 'kg')).toContain('Jul 3')
  })
})

describe('Guided vs Full notation', () => {
  const previous: PreviousComparable = {
    movementId: 'squat',
    label: '',
    load: 107.5,
    reps: 6,
    rir: 3,
    e1rm: 140,
    performedAt: '2026-07-03',
  }

  it('says how many reps were left instead of RIR on the ledger line', () => {
    expect(formatPreviousLine(previous, 'guided')).toBe('107.5 × 6 · ~3 left')
    expect(formatPreviousLine(previous, 'full')).toBe('107.5 × 6 @ RIR 3')
  })

  it('calls a taken-to-failure set max effort rather than RIR 0', () => {
    expect(formatPreviousLine({ ...previous, rir: 0 }, 'guided')).toBe('107.5 × 6 · max effort')
  })

  it('drops the estimated max and the jargon from the hero line in Guided', () => {
    const guided = formatPreviousHero(previous, 'kg', 'guided')
    expect(guided).toBe('Last time · 107.5 kg × 6 · ~3 left · Jul 3')
    expect(guided).not.toMatch(/e1RM|RIR|comparable/)
    expect(formatPreviousHero(previous, 'kg', 'full')).toContain('e1RM 140 kg')
  })

  it('keeps the technical wording by default so existing callers are unaffected', () => {
    expect(formatPreviousLine(previous)).toBe(formatPreviousLine(previous, 'full'))
    expect(formatPreviousHero(previous, 'kg')).toBe(formatPreviousHero(previous, 'kg', 'full'))
  })

  it('turns a target RIR cue into plain words in the ledger target column', () => {
    const cue = {
      ...squat,
      sets: squat.sets.map((set) => ({ ...set, targetLoad: null, targetRir: 2 })),
    }
    expect(buildTodayLedgerRows({ units: 'kg', movements: [cue] }, 'guided')[0].targetLabel).toBe('~2 left')
    expect(buildTodayLedgerRows({ units: 'kg', movements: [cue] }, 'full')[0].targetLabel).toBe('RIR 2')
  })

  it('adds the set count and tightens the time estimate in Full', () => {
    const session = { movements: [squat, press], estimatedMinutes: 75 }
    expect(buildTodaySessionMeta(session, 'guided')).toBe('2 movements · about 75 min')
    expect(buildTodaySessionMeta(session, 'full')).toBe(
      `2 movements · ${countPlannedSets(session)} sets · ~75 min`,
    )
  })

  it('omits the duration when the session has no estimate', () => {
    expect(buildTodaySessionMeta({ movements: [squat] }, 'guided')).toBe('1 movement')
  })
})
