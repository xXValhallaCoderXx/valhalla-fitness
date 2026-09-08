import { describe, expect, it } from 'vitest'
import {
  buildTemplateGrid,
  templateCellAddress,
  templateDefinitionChecks,
  templateSetFormula,
  templateSetRows,
  templateSetTarget,
} from '../src/program/template-grid'
import { buildCustomProgramTemplateDefinition } from '../src/program/custom-templates'
import type { CustomProgramBuilderInput } from '../src/program/custom-program-meta'
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
