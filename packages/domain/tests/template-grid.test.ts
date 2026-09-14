import { describe, expect, it } from 'vitest'
import {
  buildTemplateGrid,
  templateCellAddress,
  templateDefinitionChecks,
  templateGridCellValue,
  templateGridStateValues,
  templatePrescriptionFormula,
  templateRowStateLabel,
  templateSetFormula,
  templateSetRows,
  templateSetTarget,
} from '../src/program/template-grid'
import { buildCustomProgramTemplateDefinition } from '../src/program/custom-templates'
import {
  createDefaultCustomProgramBuilderInput,
  type CustomProgramBuilderInput,
} from '../src/program/custom-program-meta'
import type { TemplateSetDefinition } from '../src/program/types'

// Built from the real generator, not a hand-written fixture: the grid's whole claim is that it is
// the DSL laid out, so testing it against an invented definition would prove nothing.
const draft = (over: Partial<CustomProgramBuilderInput> = {}): CustomProgramBuilderInput => ({
  name: 'SBD 3-day',
  methodology: 'training_max_wave',
  daysPerWeek: 3,
  sessions: [
    { title: 'Day 1', mainMovementId: 'squat', mainSetCount: 3, mainTargetReps: 5, accessories: [], loggerExercises: [] },
    { title: 'Day 2', mainMovementId: 'bench_press', mainSetCount: 3, mainTargetReps: 5, accessories: [], loggerExercises: [] },
    { title: 'Day 3', mainMovementId: 'deadlift', mainSetCount: 3, mainTargetReps: 5, accessories: [], loggerExercises: [] },
  ],
  ...over,
})

const definitionFor = (over: Partial<CustomProgramBuilderInput> = {}) =>
  buildCustomProgramTemplateDefinition({ input: draft(over), templateId: 'custom-test' }).definition

describe('buildTemplateGrid', () => {
  it('lays the definition out as slots down and weeks across', () => {
    const definition = definitionFor()
    const grid = buildTemplateGrid(definition)

    expect(grid.columns).toHaveLength(definition.durationWeeks)
    expect(grid.rows).toHaveLength(definition.sessions.flatMap((session) => session.slots).length)
    expect(grid.rows[0].movementName).toBe('Squat')
    expect(grid.rows[0].key).toBe('day-1.main')
  })

  it('resolves a cell to the prescription that week declares for that slot', () => {
    const definition = definitionFor()
    const grid = buildTemplateGrid(definition)
    const address = templateCellAddress('day-1', 'main', 2)
    const cell = grid.cells[address]

    expect(cell.address).toBe('day-1.main.W3')
    expect(cell.prescription).toBe(definition.weeks[2].prescriptions['day-1-main'])
  })

  it('gives every row a cell in every week', () => {
    const grid = buildTemplateGrid(definitionFor())
    expect(Object.keys(grid.cells)).toHaveLength(grid.rows.length * grid.columns.length)
  })

  // A week that declares no prescription for a slot is a real state; the grid must not present it
  // as an empty cell that happens to look the same as a blank one.
  it('reads a missing prescription as absent rather than empty', () => {
    const definition = definitionFor()
    delete definition.weeks[1].prescriptions['day-1-main']
    const grid = buildTemplateGrid(definition)
    expect(grid.cells['day-1.main.W2'].prescription).toBeNull()
    expect(grid.cells['day-1.main.W1'].prescription).not.toBeNull()
  })
})

describe('templateSetFormula', () => {
  const slot = { movementId: 'squat', anchorMovementId: 'squat' }

  it('names the state the way the design writes it', () => {
    const set: TemplateSetDefinition = {
      targetLoad: { kind: 'percent_of_state', stateType: 'training_max', percent: 0.95, default: 'low' },
    }
    const formula = templateSetFormula({ set, slot, rounding: 2.5 })
    expect(formula.expression).toBe('=MROUND(TM_squat × 0.95, 2.5)')
    expect(formula.stateKey).toBe('squat_training_max')
    // Nothing to substitute until a training max exists.
    expect(formula.substituted).toBeNull()
    expect(formula.result).toBeNull()
  })

  it('substitutes and resolves once the state has a value', () => {
    const set: TemplateSetDefinition = {
      targetLoad: { kind: 'percent_of_state', stateType: 'training_max', percent: 0.95, default: 'low' },
    }
    const formula = templateSetFormula({
      set,
      slot,
      rounding: 2.5,
      stateValues: { squat_training_max: 130 },
    })
    expect(formula.substituted).toBe('=MROUND(130 × 0.95, 2.5)')
    expect(formula.result).toBe(122.5)
  })

  // formatNumber is weight-shaped (one decimal) and would render 0.95 as "0.9".
  it('prints percentages at full precision', () => {
    const set: TemplateSetDefinition = {
      targetLoad: { kind: 'percent_of_state', stateType: 'training_max', percent: 0.675, default: 'low' },
    }
    expect(templateSetFormula({ set, slot, rounding: 2.5 }).expression).toContain('× 0.675')
  })

  it('handles the loads that carry no arithmetic', () => {
    expect(templateSetFormula({ set: { targetLoad: { kind: 'fixed', kg: 60 } }, slot, rounding: 2.5 })).toMatchObject({
      expression: '60 kg',
      result: 60,
    })
    expect(templateSetFormula({ set: { targetLoad: { kind: 'user_selected' } }, slot, rounding: 2.5 })).toMatchObject({
      expression: 'you choose the weight',
      result: null,
    })
    expect(templateSetFormula({ set: { targetLoad: { kind: 'state', stateType: 'working_load' } }, slot, rounding: 2.5 }))
      .toMatchObject({ expression: '=WL_squat' })
  })
})

describe('templateSetTarget and templateSetRows', () => {
  it('states the set the way the template does', () => {
    expect(
      templateSetTarget({
        targetLoad: { kind: 'percent_of_state', stateType: 'training_max', percent: 0.95, default: 'low' },
        targetReps: 1,
        isAmrap: true,
        isTopSet: true,
        targetRir: 2,
      }),
    ).toBe('95 % × 1+ · top · RIR 2')
  })

  // A five-set back-off block is one line; listing it five times buries the sets that differ.
  it('collapses a run of identical sets into a range', () => {
    const backoff: TemplateSetDefinition = {
      targetLoad: { kind: 'percent_of_state', stateType: 'training_max', percent: 0.65, default: 'low' },
      targetReps: 5,
      isBackoff: true,
    }
    const rows = templateSetRows({
      prescription: { targetSummary: '', sets: [{ ...backoff, isBackoff: false, targetReps: 3 }, backoff, backoff, backoff] },
      slot: { movementId: 'squat', anchorMovementId: 'squat' },
      rounding: 2.5,
    })
    expect(rows).toHaveLength(2)
    expect(rows[0].label).toBe('1')
    expect(rows[1].label).toBe('2–4')
  })
})

describe('templateDefinitionChecks', () => {
  it('agrees with the validator on a definition the generator produced', () => {
    const result = templateDefinitionChecks(definitionFor())
    expect(result.valid).toBe(true)
    expect(result.message).toBeNull()
    expect(result.checks.every((check) => check.ok)).toBe(true)
  })

  it('names the rule that failed when the shape is wrong', () => {
    const definition = definitionFor()
    definition.sessions = definition.sessions.slice(0, 2)
    const result = templateDefinitionChecks(definition)

    expect(result.valid).toBe(false)
    expect(result.message).toBeTruthy()
    const sessionsCheck = result.checks.find((check) => check.label.startsWith('sessions ='))
    expect(sessionsCheck?.ok).toBe(false)
    expect(sessionsCheck?.detail).toBe('2 declared')
  })

  it('flags a referenced state key that requiredState never declared', () => {
    const definition = definitionFor()
    definition.requiredState = []
    const result = templateDefinitionChecks(definition)
    expect(result.valid).toBe(false)
    expect(result.checks.some((check) => !check.ok && check.detail.startsWith('missing '))).toBe(true)
  })
})

describe('templatePrescriptionFormula', () => {
  const slot = { movementId: 'squat', anchorMovementId: 'squat' }

  // The formula bar names a whole cell. Printing only set one of a ramp states a third of the truth.
  it('collapses a wave into one vector expression', () => {
    const definition = definitionFor()
    const prescription = definition.weeks[2].prescriptions['day-1-main']
    expect(templatePrescriptionFormula({ prescription, slot, rounding: 2.5 })).toBe(
      '=MROUND(TM_squat × {0.75, 0.85, 0.95}, 2.5) · reps {5, 3, 1+} · top set RIR 2 · back-off 5 × 5 @ 0.65',
    )
  })

  it('keeps a single working set scalar rather than a one-element vector', () => {
    const prescription = {
      targetSummary: '',
      sets: [
        {
          targetLoad: { kind: 'percent_of_state' as const, stateType: 'training_max' as const, percent: 0.8, default: 'low' as const },
          targetReps: 5,
        },
      ],
    }
    expect(templatePrescriptionFormula({ prescription, slot, rounding: 2.5 })).toBe(
      '=MROUND(TM_squat × 0.8, 2.5) · reps {5}',
    )
  })

  // Nothing to collapse when the loads are not percentages — the caller falls back to the set form.
  it('declines a prescription with no percentage-driven work', () => {
    const prescription = {
      targetSummary: '',
      sets: [{ targetLoad: { kind: 'user_selected' as const }, targetReps: 5 }],
    }
    expect(templatePrescriptionFormula({ prescription, slot, rounding: 2.5 })).toBeNull()
    expect(templatePrescriptionFormula({ prescription: { targetSummary: '', sets: [] }, slot, rounding: 2.5 })).toBeNull()
  })
})

describe('templateGridStateValues', () => {
  it('derives each required state from the lifter’s anchor, rounded', () => {
    const definition = definitionFor()
    const values = templateGridStateValues({
      definition,
      resolveOneRepMax: (movementId) => (movementId === 'squat' ? 150 : null),
      rounding: 2.5,
    })
    // 150 × 0.9 = 135, and the two lifts with no anchor are absent rather than zero.
    expect(values).toEqual({ squat_training_max: 135 })
  })

  it('uses the working-load percentage for working-load states', () => {
    const definition = definitionFor({ methodology: 'simple_linear' })
    const values = templateGridStateValues({
      definition,
      resolveOneRepMax: () => 100,
      rounding: 2.5,
    })
    expect(values.squat_working_load).toBe(75)
  })
})

describe('templateGridCellValue', () => {
  const definition = definitionFor()
  const grid = buildTemplateGrid(definition)
  const stateValues = { squat_training_max: 130 }

  // The week is built around its top set; the opening 75 % warm-up is the same shape every week.
  it('quotes the top set, its formula and the load it comes to', () => {
    expect(
      templateGridCellValue({ grid, address: 'day-1.main.W3', rounding: 2.5, units: 'kg', stateValues }),
    ).toEqual({
      target: '95 % × 1+ · top · RIR 2',
      formula: '=MROUND(TM_squat × 0.95, 2.5)',
      value: '122.5 kg',
    })
  })

  // Without a training max there is nothing to resolve, but the target and the formula still stand.
  it('leaves the load blank when no state value exists', () => {
    const value = templateGridCellValue({ grid, address: 'day-1.main.W3', rounding: 2.5, units: 'kg' })
    expect(value.value).toBeNull()
    expect(value.formula).toBe('=MROUND(TM_squat × 0.95, 2.5)')
  })

  it('falls back to the first resolvable set when no set is the top one', () => {
    // Week 4 is the deload: three ramping sets, none of them marked as the top set.
    const value = templateGridCellValue({ grid, address: 'day-1.main.W4', rounding: 2.5, units: 'kg', stateValues })
    expect(value.target).toBe('40 % × 5')
    expect(value.value).toBe('52.5 kg')
  })

  it('reads an absent prescription as empty', () => {
    const sparse = buildTemplateGrid(definitionFor())
    sparse.cells['day-1.main.W2'].prescription = null
    const empty = { target: null, formula: null, value: null }
    expect(templateGridCellValue({ grid: sparse, address: 'day-1.main.W2', rounding: 2.5, units: 'kg' })).toEqual(empty)
    expect(templateGridCellValue({ grid: sparse, address: 'nope', rounding: 2.5, units: 'kg' })).toEqual(empty)
  })
})

describe('templateRowStateLabel', () => {
  it('names the state a row reads', () => {
    const grid = buildTemplateGrid(definitionFor())
    expect(templateRowStateLabel(grid, grid.rows[0])).toBe('TM_squat')
  })

  it('returns null for a row that prescribes no loads', () => {
    // Logger-only days are user-selected all the way down, so they read no programme state.
    const loggerOnly = buildCustomProgramTemplateDefinition({
      input: createDefaultCustomProgramBuilderInput({ methodology: 'none', daysPerWeek: 3 }),
      templateId: 'custom-logger',
    }).definition
    const grid = buildTemplateGrid(loggerOnly)
    expect(templateRowStateLabel(grid, grid.rows[0])).toBeNull()
  })
})
