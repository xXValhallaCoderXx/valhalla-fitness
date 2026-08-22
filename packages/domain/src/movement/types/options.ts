import type { MovementRole, Unit } from '@sheetless/domain/shared/types'

export type SwapScope = 'session' | 'phase_slot'

export type MovementReplacementRule = {
  id: string
  sourceMovementId: string
  replacementMovementId: string
  role?: MovementRole | null
  templateId?: string | null
  phaseKey?: string | null
  slotId?: string | null
  relationshipLabel: string
  allowSessionScope: boolean
  allowPhaseSlotScope: boolean
}

export type MovementSwapOption = {
  movementId: string
  movementName: string
  category: string
  equipment: string[]
  relationshipLabel: string
  source: 'rule' | 'catalog' | 'default'
  ruleId?: string
  allowedScopes: SwapScope[]
  freeWeightCompatible: boolean
}

export type AccessoryMovementOption = {
  movementId: string
  movementName: string
  category: string
  equipment: string[]
  defaultUnit: Unit
  freeWeightCompatible: boolean
}
