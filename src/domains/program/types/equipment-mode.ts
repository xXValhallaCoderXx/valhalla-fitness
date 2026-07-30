import type { MovementRole } from '~/shared/types'

export type ProgramEquipmentMode = 'standard' | 'free_weight'

export type FreeWeightPolicyRule = {
  id: string
  sourceMovementId: string
  replacementMovementIds: string[]
  loadHandling: 'clear'
}

export type FreeWeightPolicyVersion = {
  id: string
  version: string
  checksum: string
  rules: FreeWeightPolicyRule[]
}

export type FreeWeightChoiceDraft = {
  templateSessionId: string
  slotId: string
  phaseKey: string
  role: MovementRole
  sourceMovementId: string
  replacementMovementId: string
  policyRuleId: string
}

export type ProgramEquipmentModeChoice = FreeWeightChoiceDraft & {
  id?: string
  programInstanceId?: string
}

export type EquipmentModeAdaptation = {
  mode: 'free_weight'
  sourceMovementId: string
  policyRuleId: string
  loadReset: true
}

export type ProgramEquipmentModePreviewChange = FreeWeightChoiceDraft & {
  sessionTitle: string
  phaseLabel: string
  sourceMovementName: string
  replacementMovementName: string
  alternatives: Array<{
    movementId: string
    movementName: string
    policyRuleId: string
  }>
  selectionState: 'saved' | 'defaulted' | 'stale'
}

export type ProgramEquipmentModePreview = {
  programId: string
  currentMode: ProgramEquipmentMode
  targetMode: ProgramEquipmentMode
  expectedStateVersion: number
  policy: FreeWeightPolicyVersion | null
  changes: ProgramEquipmentModePreviewChange[]
  unresolved: Array<{
    templateSessionId: string
    slotId: string
    phaseKey: string
    sourceMovementId: string
    sourceMovementName: string
  }>
  canApply: boolean
}
