import type { MovementRole, SessionHardness } from '@sheetless/domain/shared/types'
import type {
  TemplateDefinition,
  TemplatePrescriptionDefinition,
  TemplateSetDefinition,
  TemplateSlotDefinition,
} from '@sheetless/domain/program/types'
import { getMovementName } from '@sheetless/domain/movement/movements'
import { mround } from '@sheetless/domain/shared/math'
import { referencedStateKey } from '@sheetless/domain/program/return-loads'
import { stateKeyLabel } from '@sheetless/domain/program/load-trace'
import { movementIdsForSlot } from '@sheetless/domain/program/template-engine'
import { validateTemplateDefinition } from '@sheetless/domain/program/template-engine-schema'

/**
 * A template definition, read as a spreadsheet.
 *
 * Rows are slots, columns are weeks, and a cell is
 * `weeks[w].prescriptions[slot.prescriptionId]` — the grid is not a view *of* the DSL, it is the
 * DSL laid out. Nothing here computes anything the engine does not already; it only arranges it.
 */
export type TemplateGridColumn = {
  weekIndex: number
  label: string
  phaseKey: string
  phaseLabel: string
  hardness: SessionHardness
}

export type TemplateGridRow = {
  /** `sessionId.slotId` — unique across the grid, and the row half of a cell address. */
  key: string
  sessionId: string
  sessionTitle: string
  slotId: string
  prescriptionId: string
  role: MovementRole
  movementId: string
  movementName: string
  anchorMovementId: string | null
  progressionRuleId: string | null
}

export type TemplateGridCell = {
  address: string
  rowKey: string
  weekIndex: number
  /** Null when this week declares no prescription for the slot — a real state, not an empty one. */
  prescription: TemplatePrescriptionDefinition | null
}

export type TemplateGrid = {
  columns: TemplateGridColumn[]
  rows: TemplateGridRow[]
  /** Keyed by address, so a cell is a lookup rather than a nested scan. */
  cells: Record<string, TemplateGridCell>
}

/**
 * `day-1.main.W3`.
 *
 * The design mock writes `D1.squat.W3`, but `squat` is not a slot id in this DSL (slots are
 * `main` / `variation` / `accessory-1`) and shortening `day-1` would need a special case for every
 * template that does not name its sessions that way. The point of showing an address is that you
 * could use it to find the cell, so it is printed literally.
 */
export function templateCellAddress(sessionId: string, slotId: string, weekIndex: number): string {
  return `${sessionId}.${slotId}.W${weekIndex + 1}`
}

export function buildTemplateGrid(definition: TemplateDefinition): TemplateGrid {
  const columns = definition.weeks.map((week, weekIndex): TemplateGridColumn => ({
    weekIndex,
    label: week.label,
    phaseKey: week.phaseKey,
    phaseLabel: week.phaseLabel,
    hardness: week.hardness,
  }))

  const rows: TemplateGridRow[] = []
  const cells: Record<string, TemplateGridCell> = {}

  for (const session of definition.sessions) {
    for (const slot of session.slots) {
      const movementId = movementIdsForSlot(slot.movementId)[0] ?? ''
      const key = `${session.id}.${slot.id}`
      rows.push({
        key,
        sessionId: session.id,
        sessionTitle: session.title,
        slotId: slot.id,
        prescriptionId: slot.prescriptionId,
        role: slot.role,
        movementId,
        movementName: getMovementName(movementId),
        anchorMovementId: slot.anchorMovementId ?? null,
        progressionRuleId: definition.progressionRules?.[slot.id] ?? null,
      })

      for (const [weekIndex, week] of definition.weeks.entries()) {
        const address = templateCellAddress(session.id, slot.id, weekIndex)
        cells[address] = {
          address,
          rowKey: key,
          weekIndex,
          prescription: week.prescriptions[slot.prescriptionId] ?? null,
        }
      }
    }
  }

  return { columns, rows, cells }
}

export type TemplateSetFormula = {
  /** `=MROUND(TM_squat × 0.95, 2.5)`, or a plain statement for loads with no arithmetic. */
  expression: string
  /** The same line with the state's current value substituted; null when the value is unknown. */
  substituted: string | null
  /** The load this set resolves to; null when it cannot be resolved yet. */
  result: number | null
  /** The programme state this set reads, when it reads one. */
  stateKey: string | null
  /** That state as the design writes it — `TM_squat`, `WL_row`. */
  stateLabel: string | null
}

/**
 * How one set's load is worked out.
 *
 * `stateValues` is optional: without it the expression still renders with state *names*, which is
 * what makes the grid readable before a programme has been started.
 */
export function templateSetFormula({
  set,
  slot,
  rounding,
  stateValues = {},
}: {
  set: TemplateSetDefinition
  slot: Pick<TemplateSlotDefinition, 'movementId' | 'anchorMovementId'>
  rounding: number
  stateValues?: Record<string, number>
}): TemplateSetFormula {
  const load = set.targetLoad
  if (!load || load.kind === 'user_selected') {
    return { expression: 'you choose the weight', substituted: null, result: null, stateKey: null, stateLabel: null }
  }
  if (load.kind === 'fixed') {
    return { expression: `${load.kg} kg`, substituted: null, result: load.kg, stateKey: null, stateLabel: null }
  }

  const movementId = movementIdsForSlot(slot.movementId)[0] ?? ''
  const stateKey = referencedStateKey(load, movementId, slot.anchorMovementId ?? movementId)
  if (!stateKey) {
    return { expression: 'entered when you train', substituted: null, result: null, stateKey: null, stateLabel: null }
  }
  const name = stateKeyLabel(stateKey, load.stateType)
  const value = stateValues[stateKey] ?? null

  if (load.kind === 'state') {
    return {
      expression: `=${name}`,
      substituted: value === null ? null : `=${traceNumber(value)}`,
      result: value,
      stateKey,
      stateLabel: name,
    }
  }

  const percent = load.default === 'high' && load.percentMax ? load.percentMax : load.percent
  const expression = `=MROUND(${name} × ${traceNumber(percent)}, ${traceNumber(rounding)})`
  if (value === null) return { expression, substituted: null, result: null, stateKey, stateLabel: name }
  const result = mround(value * percent, rounding)
  return {
    expression,
    substituted: `=MROUND(${traceNumber(value)} × ${traceNumber(percent)}, ${traceNumber(rounding)})`,
    result,
    stateKey,
    stateLabel: name,
  }
}

/**
 * One expression for a whole prescription, for the grid's formula bar.
 *
 * `templateSetFormula` explains a single set, which is right in the inspector but wrong in a bar
 * that names a cell: a wave cell is three percentages of one state, and printing only the first
 * ("=MROUND(TM_squat × 0.75, 2.5)") states a third of the truth. This collapses the ramp into a
 * vector and appends what the sets actually ask for.
 *
 * Returns null when the prescription has no percentage-driven sets to collapse — the caller falls
 * back to the single-set form.
 */
export function templatePrescriptionFormula({
  prescription,
  slot,
  rounding,
  stateValues = {},
}: {
  prescription: TemplatePrescriptionDefinition
  slot: Pick<TemplateSlotDefinition, 'movementId' | 'anchorMovementId'>
  rounding: number
  stateValues?: Record<string, number>
}): string | null {
  const working = prescription.sets.filter((set) => !set.isBackoff)
  if (!working.length) return null

  const percents: string[] = []
  const reps: string[] = []
  let stateName: string | null = null
  for (const set of working) {
    const load = set.targetLoad
    if (load?.kind !== 'percent_of_state') return null
    const name = templateSetFormula({ set, slot, rounding, stateValues }).stateLabel
    if (!name) return null
    if (stateName && stateName !== name) return null
    stateName = name
    const percent = load.default === 'high' && load.percentMax ? load.percentMax : load.percent
    percents.push(traceNumber(percent))
    reps.push(`${repLabel(set) ?? '—'}${set.isAmrap ? '+' : ''}`)
  }
  if (!stateName) return null

  const head = percents.length > 1
    ? `=MROUND(${stateName} × {${percents.join(', ')}}, ${traceNumber(rounding)})`
    : `=MROUND(${stateName} × ${percents[0]}, ${traceNumber(rounding)})`

  const tail: string[] = [`reps {${reps.join(', ')}}`]
  const top = working.find((set) => set.isTopSet)
  if (top?.targetRir !== null && top?.targetRir !== undefined) tail.push(`top set RIR ${top.targetRir}`)
  const backoff = prescription.sets.filter((set) => set.isBackoff)
  if (backoff.length) {
    const load = backoff[0].targetLoad
    const percent = load?.kind === 'percent_of_state' ? traceNumber(load.percent) : null
    const label = repLabel(backoff[0])
    tail.push(
      percent
        ? `back-off ${backoff.length} × ${label ?? '—'} @ ${percent}`
        : `back-off ${backoff.length} × ${label ?? '—'}`,
    )
  }

  return `${head} · ${tail.join(' · ')}`
}

function repLabel(set: TemplateSetDefinition): string | null {
  if (set.targetReps !== undefined) return String(set.targetReps)
  if (set.targetRepMin !== undefined && set.targetRepMax !== undefined) {
    return `${set.targetRepMin}–${set.targetRepMax}`
  }
  return set.targetRepMin !== undefined ? String(set.targetRepMin) : null
}

export type TemplateSetRow = {
  /** "3", or "4–8" when identical sets are collapsed. */
  label: string
  /** "95 % × 1+ · top · RIR 2" */
  target: string
  formula: TemplateSetFormula
  /** Index of the first set this row covers, for selecting it. */
  setIndex: number
  /** The set the week is built around — highlighted in the inspector, quoted in the grid. */
  isTopSet: boolean
}

/**
 * The sets of one prescription, with runs of identical sets collapsed.
 *
 * A five-set back-off block is one line, not five: the design shows "4–8", and listing them
 * individually would bury the two sets that actually differ.
 */
export function templateSetRows({
  prescription,
  slot,
  rounding,
  stateValues = {},
}: {
  prescription: TemplatePrescriptionDefinition
  slot: Pick<TemplateSlotDefinition, 'movementId' | 'anchorMovementId'>
  rounding: number
  stateValues?: Record<string, number>
}): TemplateSetRow[] {
  const rows: TemplateSetRow[] = []
  for (const [index, set] of prescription.sets.entries()) {
    const formula = templateSetFormula({ set, slot, rounding, stateValues })
    const target = templateSetTarget(set)
    const previous = rows[rows.length - 1]
    if (previous && previous.target === target && previous.formula.expression === formula.expression) {
      previous.label = `${previous.setIndex + 1}–${index + 1}`
      continue
    }
    rows.push({ label: String(index + 1), target, formula, setIndex: index, isTopSet: Boolean(set.isTopSet) })
  }
  return rows
}

/** "95 % × 1+ · top · RIR 2" — the set as the template states it, not as it will be logged. */
export function templateSetTarget(set: TemplateSetDefinition): string {
  const parts: string[] = []
  const load = set.targetLoad
  if (load?.kind === 'percent_of_state') {
    const percent = load.default === 'high' && load.percentMax ? load.percentMax : load.percent
    parts.push(`${traceNumber(percent * 100)} %`)
  }

  const reps =
    set.targetReps !== undefined
      ? String(set.targetReps)
      : set.targetRepMin !== undefined && set.targetRepMax !== undefined
        ? `${set.targetRepMin}–${set.targetRepMax}`
        : null
  if (reps) parts.push(`× ${reps}${set.isAmrap ? '+' : ''}`)

  const flags: string[] = []
  if (set.isTopSet) flags.push('top')
  if (set.isBackoff) flags.push('back-off')
  if (set.targetRir !== null && set.targetRir !== undefined) flags.push(`RIR ${set.targetRir}`)
  if (set.targetRpe !== null && set.targetRpe !== undefined) flags.push(`RPE ${set.targetRpe}`)

  const head = parts.join(' ') || set.label || 'as prescribed'
  return flags.length ? `${head} · ${flags.join(' · ')}` : head
}

/**
 * The programme-state values the grid resolves its loads against.
 *
 * A template declares the states it needs; the lifter's anchors say what those states are worth
 * today. `resolveOneRepMax` is passed in rather than imported so this stays a pure arrangement of
 * two things the caller already has — typically `setupOneRepMaxResolver`, so the grid's numbers are
 * the same ones setup would show.
 */
export function templateGridStateValues({
  definition,
  resolveOneRepMax,
  rounding,
  trainingMaxPercent = 0.9,
  workingLoadPercent = 0.75,
}: {
  definition: TemplateDefinition
  resolveOneRepMax: (movementId: string) => number | null
  rounding: number
  trainingMaxPercent?: number
  workingLoadPercent?: number
}): Record<string, number> {
  const values: Record<string, number> = {}
  for (const state of definition.requiredState) {
    const oneRepMax = resolveOneRepMax(state.movementId)
    if (oneRepMax === null) continue
    const percent = state.type === 'training_max' ? trainingMaxPercent : workingLoadPercent
    values[state.key] = mround(oneRepMax * percent, rounding)
  }
  return values
}

export type TemplateGridCellValue = {
  /** "95 % × 1+ · top · RIR 2" — what the template asks for. Null when the week declares nothing. */
  target: string | null
  /** "=MROUND(TM_squat × 0.95, 2.5)" — how the load is worked out. */
  formula: string | null
  /** "122.5 kg" — what it resolves to, once the lifter has the state it reads. */
  value: string | null
}

/**
 * What one cell says: the target, the formula behind it, and the load it comes to.
 *
 * The cell quotes its *top set* — the one the week is built around. A wave's opening warm-up is the
 * same 65 % in every week and says nothing about which week you are looking at. With no top set
 * declared it falls back to the first set that resolves, so a prescription whose leading sets are
 * user-chosen still renders something.
 */
export function templateGridCellValue({
  grid,
  address,
  rounding,
  units,
  stateValues = {},
}: {
  grid: TemplateGrid
  address: string
  rounding: number
  units: string
  stateValues?: Record<string, number>
}): TemplateGridCellValue {
  const empty: TemplateGridCellValue = { target: null, formula: null, value: null }
  const cell = grid.cells[address]
  const row = cell ? grid.rows.find((entry) => entry.key === cell.rowKey) ?? null : null
  if (!cell?.prescription || !row) return empty

  const rows = templateSetRows({
    prescription: cell.prescription,
    slot: { movementId: row.movementId, anchorMovementId: row.anchorMovementId ?? undefined },
    rounding,
    stateValues,
  })
  const headline = rows.find((entry) => entry.isTopSet)
    ?? rows.find((entry) => entry.formula.result !== null)
    ?? rows[0]
  if (!headline) return empty

  return {
    target: headline.target,
    formula: headline.formula.expression,
    value: headline.formula.result === null ? null : `${headline.formula.result} ${units}`,
  }
}

/**
 * The programme state a row reads — `TM_squat`, `WL_row` — or null when it prescribes no loads.
 *
 * Scans the row's own cells rather than the slot, because the state type is a property of the
 * prescription's loads, not of the movement.
 */
export function templateRowStateLabel(grid: TemplateGrid, row: TemplateGridRow): string | null {
  const slot = { movementId: row.movementId, anchorMovementId: row.anchorMovementId ?? undefined }
  for (const column of grid.columns) {
    const cell = grid.cells[templateCellAddress(row.sessionId, row.slotId, column.weekIndex)]
    for (const set of cell?.prescription?.sets ?? []) {
      const { stateLabel } = templateSetFormula({ set, slot, rounding: 1 })
      if (stateLabel) return stateLabel
    }
  }
  return null
}

export type TemplateCheck = {
  label: string
  ok: boolean
  detail: string
}

/**
 * The three structural rules the schema actually enforces, said out loud.
 *
 * `validateTemplateDefinition` stays the authority — it is a single zod verdict, so it cannot
 * report which rule failed. These mirror `template-engine-schema.ts`'s superRefine so the panel can
 * explain a failure, and the `valid` field is the validator's answer, never this function's.
 */
export function templateDefinitionChecks(definition: TemplateDefinition): {
  valid: boolean
  message: string | null
  checks: TemplateCheck[]
} {
  const verdict = validateTemplateDefinition(definition)
  const declared = new Set(definition.requiredState.map((state) => state.key))
  const referenced = new Set<string>()
  for (const session of definition.sessions) {
    for (const slot of session.slots) {
      const movementId = movementIdsForSlot(slot.movementId)[0] ?? ''
      for (const week of definition.weeks) {
        for (const set of week.prescriptions[slot.prescriptionId]?.sets ?? []) {
          const key = referencedStateKey(set.targetLoad, movementId, slot.anchorMovementId ?? movementId)
          if (key) referenced.add(key)
        }
      }
    }
  }
  const undeclared = [...referenced].filter((key) => !declared.has(key))

  return {
    valid: verdict.ok,
    message: verdict.ok ? null : verdict.message,
    checks: [
      {
        label: `sessions = daysPerWeek (${definition.daysPerWeek})`,
        ok: definition.sessions.length === definition.daysPerWeek,
        detail: `${definition.sessions.length} declared`,
      },
      {
        label: `weeks = durationWeeks (${definition.durationWeeks})`,
        ok: definition.weeks.length === definition.durationWeeks,
        detail: `${definition.weeks.length} declared`,
      },
      {
        label: `${declared.size} state key${declared.size === 1 ? '' : 's'} declared in requiredState`,
        ok: undeclared.length === 0,
        detail: undeclared.length ? `missing ${undeclared.join(', ')}` : `covers all ${referenced.size} referenced`,
      },
    ],
  }
}

/** Formula numbers print at full precision; a trace that rounds its own workings is not a trace. */
function traceNumber(value: number): string {
  if (Number.isInteger(value)) return String(value)
  return String(Number(value.toFixed(4)))
}
