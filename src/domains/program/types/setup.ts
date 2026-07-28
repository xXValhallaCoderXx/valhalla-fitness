import type { MovementSwapOption } from '~/domains/movement'
import type { MovementRole, SessionHardness } from '~/shared/types'
import type { ProgramTemplateOrigin } from '~/domains/program/types/template'

export type ProgramStartMovementOverrideInput = {
  slotId: string
  phaseKey: string
  role: Extract<MovementRole, 'variation' | 'accessory'>
  originalMovementId: string
  replacementMovementId: string
}

export type ProgramStartAccessoryAdditionInput = {
  sessionId: string
  sourceSlotId: string
  movementId: string
  phaseKey?: string
}

export type ProgramSetupSlotOption = {
  sessionId: string
  sessionTitle: string
  slotId: string
  templateSlotId: string
  phaseKey: string
  phaseLabel: string
  role: Extract<MovementRole, 'variation' | 'accessory'>
  defaultMovementId: string
  defaultMovementName: string
  prescriptionId: string
  targetSummary: string
  replacementOptions: MovementSwapOption[]
}

export type ProgramSetupAccessoryPrescriptionOption = {
  sourceSlotId: string
  label: string
  prescriptionId: string
  targetSummary: string
}

export type ProgramSetupPreviewMovement = {
  slotId: string
  templateSlotId: string
  phaseKey: string
  phaseLabel: string
  setupPhaseKey: string
  role: MovementRole
  roleLabel: string
  defaultMovementId: string
  defaultMovementName: string
  targetSummary: string
  progressionRuleId?: string | null
  replacementOptions: MovementSwapOption[]
}

export type ProgramSetupPreviewSession = {
  id: string
  label: string
  title: string
  estimatedMinutes: number
  movementSummary: string
  keyPrescription: string
  movements: ProgramSetupPreviewMovement[]
}

export type ProgramSetupPreviewWeek = {
  index: number
  label: string
  phaseKey: string
  phaseLabel: string
  subtitle: string
  summary: string
  hardness: SessionHardness
  /** Representative main-lift working intensity as a 0–1 fraction; undefined when the template is
   *  not percent-of-state (working-load / RPE / user-selected) so the intensity ramp degrades. */
  intensityPercent?: number
  sessions: ProgramSetupPreviewSession[]
}

export type ProgramSetupSessionOption = {
  id: string
  title: string
  slots: ProgramSetupSlotOption[]
  accessoryPrescriptions: ProgramSetupAccessoryPrescriptionOption[]
}

export type ProgramSetupOptions = {
  templateId: string
  templateName: string
  origin: ProgramTemplateOrigin
  sessions: ProgramSetupSessionOption[]
  previewWeeks: ProgramSetupPreviewWeek[]
  accessoryCatalog: Array<{
    movementId: string
    movementName: string
    category: string
    equipment: string[]
  }>
}
