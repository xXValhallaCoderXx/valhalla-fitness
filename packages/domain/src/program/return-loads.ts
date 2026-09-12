import { resolveProgramMovementOverride } from './equipment-mode'
import type { ProgramInstance, TemplateLoadDefinition } from './types'
import type { FixedLoadSelector, ProgramLoadChange } from './types/return'
import { convertWeight } from '../shared/math'
import { getMovementName } from '../movement/movements'

export function floorToStep(value: number, step: number) {
  if (!Number.isFinite(value) || !Number.isFinite(step) || step <= 0 || value < 0) {
    throw new Error('Enter a non-negative load and a positive rounding step.')
  }
  // Decimal multiplication noise must not remove a whole step from an exact result.
  return Number((Math.floor(Number((value / step).toFixed(10))) * step).toFixed(6))
}

export function resetLoad(value: number, reduction: number, step: number): number | null {
  if (!Number.isFinite(reduction) || reduction < 0 || reduction > 1)
    throw new Error('Invalid reduction')
  if (value === 0) return 0
  const next = floorToStep(value * (1 - reduction), step)
  return next > 0 ? next : null
}

export function floorCappedIncrease(increase: number, cap: number, step: number) {
  const limit = Math.min(increase, cap)
  const rounded = floorToStep(limit, step)
  return rounded > limit ? Number(Math.max(0, rounded - step).toFixed(6)) : rounded
}

export function fixedLoadKey(selector: FixedLoadSelector) {
  return JSON.stringify([
    selector.templateSessionId,
    selector.slotId,
    selector.weekIndex,
    selector.movementId,
    selector.setIndex,
  ])
}

/**
 * The percentage a set actually uses. A `percent_of_state` set may carry two — `percent` and a
 * `percentMax` used when the prescription opts into the top of the range — and picking the wrong
 * one silently changes every planned load, so this rule lives in exactly one place.
 */
export function percentOf(load: TemplateLoadDefinition | undefined): number {
  if (load?.kind !== 'percent_of_state') return 1
  return load.default === 'high' && load.percentMax ? load.percentMax : load.percent
}

export function referencedStateKey(
  load: TemplateLoadDefinition | undefined,
  movementId: string,
  anchorId: string,
) {
  if (!load || load.kind === 'fixed' || load.kind === 'user_selected') return null
  if (load.kind === 'percent_of_state' && load.default === 'blank') return null
  return (
    load.stateKey ?? `${load.kind === 'percent_of_state' ? anchorId : movementId}_${load.stateType}`
  )
}

/** Enumerate exact instance-owned load sources once, even when several lifts share an anchor. */
export function programLoadChanges(program: ProgramInstance, reduction = 0.2): ProgramLoadChange[] {
  const definition = program.templateDefinition
  if (!definition) throw new Error('Programme definition unavailable')
  const changes = new Map<string, ProgramLoadChange>()
  for (const [weekIndex, week] of definition.weeks.entries()) {
    for (const session of definition.sessions) {
      for (const slot of session.slots) {
        const planned =
          typeof slot.movementId === 'string'
            ? slot.movementId
            : (slot.movementId.byPhase?.[week.phaseKey] ?? slot.movementId.default)
        const slotId = `slot-${session.id}-${slot.id}`
        const movementId = resolveProgramMovementOverride(program.movementOverrides ?? [], {
          slotId,
          phaseKey: week.phaseKey,
          role: slot.role,
          movementId: planned,
          currentWeekIndex: program.currentWeekIndex,
        })
        for (const [index, set] of (
          week.prescriptions[slot.prescriptionId]?.sets ?? []
        ).entries()) {
          const stateKey = referencedStateKey(
            set.targetLoad,
            movementId,
            slot.anchorMovementId ?? planned,
          )
          if (stateKey) {
            const state = program.stateValues.find((value) => value.key === stateKey)
            if (state?.value != null)
              changes.set(`state:${stateKey}`, {
                key: stateKey,
                kind: 'state',
                label: `${state.label ?? getMovementName(state.movementId)} · programme load reference`,
                before: state.value,
                after: resetLoad(state.value, reduction, program.rounding),
              })
          }
          if (set.targetLoad?.kind === 'fixed') {
            const selector = {
              templateSessionId: session.id,
              slotId,
              weekIndex,
              movementId,
              setIndex: index + 1,
            }
            const key = fixedLoadKey(selector)
            const load = set.targetLoad
            const before =
              program.loadOverrides?.find((item) => item.key === key)?.value ??
              (program.units === 'kg'
                ? load.kg
                : (load.lb ?? Math.round(convertWeight(load.kg, 'kg', 'lb') / 5) * 5))
            changes.set(`fixed:${key}`, {
              key,
              kind: 'fixed',
              selector,
              label: `${session.title} · ${week.label} · ${getMovementName(movementId)} · set ${index + 1}`,
              before,
              after: resetLoad(before, reduction, program.rounding),
            })
          }
        }
      }
    }
  }
  for (const addition of program.accessoryAdditions ?? []) {
    if (!addition.id) continue
    for (const set of addition.sets ?? []) {
      if (set.targetLoad == null) continue
      const key = `${addition.id}:${set.setIndex}`
      changes.set(`accessory:${key}`, {
        key,
        kind: 'accessory',
        accessoryId: addition.id,
        setIndex: set.setIndex,
        label: `${getMovementName(addition.movementId)} · added set ${set.setIndex}`,
        before: set.targetLoad,
        after: resetLoad(set.targetLoad, reduction, program.rounding),
      })
    }
  }
  return [...changes.values()]
}

export function withLoadChanges(
  program: ProgramInstance,
  changes: ProgramLoadChange[],
): ProgramInstance {
  if (changes.some((change) => change.after === null))
    throw new Error('Enter an explicit load for values that round to zero.')
  const fixed = changes.filter((change) => change.kind === 'fixed')
  return {
    ...program,
    stateValues: program.stateValues.map((state) => ({
      ...state,
      value:
        changes.find((change) => change.kind === 'state' && change.key === state.key)?.after ??
        state.value,
    })),
    loadOverrides: [
      ...(program.loadOverrides ?? []).filter(
        (override) => !fixed.some((change) => change.key === override.key),
      ),
      ...fixed.map((change) => ({
        key: change.key,
        selector: change.selector!,
        value: change.after!,
      })),
    ],
    accessoryAdditions: program.accessoryAdditions?.map((addition) => ({
      ...addition,
      sets: addition.sets?.map((set) => ({
        ...set,
        targetLoad:
          changes.find(
            (change) =>
              change.kind === 'accessory' &&
              change.accessoryId === addition.id &&
              change.setIndex === set.setIndex,
          )?.after ?? set.targetLoad,
      })),
    })),
  }
}
