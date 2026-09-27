import type { ProgramStateInput, TemplateSetDefinition } from './types'
import type { Unit } from '../shared/types'
import { mround } from './progression'
import { convertWeight } from '../shared/math'
import { percentOf, referencedStateKey } from './return-loads'

export type TemplateLoadContext = {
  stateValues: ProgramStateInput[]
  movementId: string
  anchorMovementId: string
  rounding: number
  units: Unit
}

/** The same load calculation serves a saved programme and its unsaved setup preview. */
export function resolveTemplateTargetLoad(
  load: TemplateSetDefinition['targetLoad'] | undefined,
  context: TemplateLoadContext,
  missingState: 'throw' | 'unavailable' = 'throw',
): number | null {
  if (!load || load.kind === 'user_selected' || (load.kind === 'percent_of_state' && load.default === 'blank')) return null
  if (load.kind === 'fixed') {
    return context.units === 'kg' ? load.kg : load.lb ?? mround(convertWeight(load.kg, 'kg', 'lb'), 5)
  }
  const stateKey = referencedStateKey(load, context.movementId, context.anchorMovementId)
  const state = context.stateValues.find(item => item.key === stateKey)
  if (!state || !Number.isFinite(state.value) || Number(state.value) <= 0) {
    if (missingState === 'unavailable') return null
    throw new Error(`Missing valid programme state for ${stateKey}`)
  }
  if (load.kind === 'state') return Number(state.value)
  return mround(Number(state.value) * percentOf(load), context.rounding)
}
