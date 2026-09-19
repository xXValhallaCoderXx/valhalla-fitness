import { describe, expect, it } from 'vitest'
import {
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

describe('Today v3 row fields', () => {
  const deadlift = {
    id: 'slot-day-3-main',
    movementId: 'deadlift',
    movementName: 'Deadlift',
    role: 'main' as const,
    orderIndex: 1,
    targetSummary: '75%x5 · 85%x3 · 95%x1+ · back-off 5x5',
    sets: [
      { id: 's1', setIndex: 1, targetLoad: 145, targetReps: 5, sourceBinding: { stateKey: 'deadlift_training_max' } },
      { id: 's2', setIndex: 2, targetLoad: 162.5, targetReps: 3 },
      { id: 's3', setIndex: 3, targetLoad: 182.5, targetReps: 1, isTopSet: true, isAmrap: true },
      { id: 's4', setIndex: 4, targetLoad: 125, targetReps: 5, isBackoff: true },
    ],
  } as never

  it('lists every distinct ramp load and excludes the back-off', () => {
    const [row] = buildTodayLedgerRows({ units: 'kg', movements: [deadlift] })
    expect(row.loadsLabel).toBe('145 · 162.5 · 182.5 kg')
  })

  it('collapses to a single load when the row does not ramp', () => {
    const flat = {
      ...(deadlift as unknown as Record<string, unknown>),
      sets: [
        { id: 'a', setIndex: 1, targetLoad: 112.5, targetReps: 5 },
        { id: 'b', setIndex: 2, targetLoad: 112.5, targetReps: 5 },
      ],
    } as never
    expect(buildTodayLedgerRows({ units: 'kg', movements: [flat] })[0].loadsLabel).toBe('112.5 kg')
  })

  it('falls back to the effort cue when nothing is projected', () => {
    const cue = {
      ...(deadlift as unknown as Record<string, unknown>),
      sets: [{ id: 'a', setIndex: 1, targetRir: 2, targetReps: 10 }],
    } as never
    expect(buildTodayLedgerRows({ units: 'kg', movements: [cue] }, 'guided')[0].loadsLabel).toBe('~2 left')
    expect(buildTodayLedgerRows({ units: 'kg', movements: [cue] }, 'full')[0].loadsLabel).toBe('RIR 2')
  })

  it('prints the authored notation in Full and a plain sets label in Guided', () => {
    expect(buildTodayLedgerRows({ units: 'kg', movements: [deadlift] }, 'full')[0].prescriptionLabel).toBe(
      '75%x5 · 85%x3 · 95%x1+ · back-off 5x5',
    )
    // Guided never shows a percentage.
    const guided = buildTodayLedgerRows({ units: 'kg', movements: [deadlift] }, 'guided')[0]
    expect(guided.prescriptionLabel).toBe('4 sets')
    expect(guided.prescriptionLabel).not.toContain('%')
  })

  it('attaches the reason to the row whose set binds that state key, in Guided only', () => {
    const options = { mode: 'guided' as const, reasonByStateKey: { deadlift_training_max: 'up 5 kg — you got every rep last time' } }
    expect(buildTodayLedgerRows({ units: 'kg', movements: [deadlift] }, options).at(0)?.reason).toBe(
      'up 5 kg — you got every rep last time',
    )
    expect(
      buildTodayLedgerRows({ units: 'kg', movements: [deadlift] }, { ...options, mode: 'full' }).at(0)?.reason,
    ).toBeNull()
  })

  it('leaves the reason null when no decision matches the row', () => {
    expect(
      buildTodayLedgerRows({ units: 'kg', movements: [deadlift] }, { mode: 'guided', reasonByStateKey: {} })[0].reason,
    ).toBeNull()
  })

  it('names the equipment mode in the meta line only when it is not standard', () => {
    const session = { movements: [deadlift], estimatedMinutes: 75 }
    expect(buildTodaySessionMeta(session, 'guided')).toBe('1 movement · about 75 min')
    expect(buildTodaySessionMeta({ ...session, equipmentMode: 'standard' }, 'guided')).toBe('1 movement · about 75 min')
    expect(buildTodaySessionMeta({ ...session, equipmentMode: 'free_weight' }, 'guided')).toBe(
      '1 movement · about 75 min · free weights',
    )
    expect(buildTodaySessionMeta({ ...session, equipmentMode: 'free_weight' }, 'full')).toBe(
      '1 movement · 4 sets · ~75 min · free weights',
    )
  })
})
