import type { SetTarget } from '@sheetless/domain/session/types'
import type { ProgramLoadOverride, ProgramReturnPeriod } from './return'
import type { MovementRole, Unit } from '@sheetless/domain/shared/types'
import type {
  ProgramStateRequirement,
  ProgramStateType,
  TemplateDefinition,
} from '@sheetless/domain/program/types/template'
import type {
  ProgramEquipmentMode,
  ProgramEquipmentModeChoice,
} from '@sheetless/domain/program/types/equipment-mode'

export type AccessoryProgressionMethod = 'history_only' | 'double_progression'

export type ProgramCustomizationStatus = 'default' | 'customized'

export type ProgramStateInput = ProgramStateRequirement & {
  value: number | null
  unit?: Unit
  /** Last time the persisted state row changed (progression accepted, manual edit). */
  updatedAt?: string | null
}

export type ProgramInstance = {
  id: string
  templateId: string
  templateVersionId: string
  title: string
  status: 'active' | 'paused' | 'completed' | 'archived'
  startDate: string
  units: Unit
  rounding: number
  currentWeekIndex: number
  stateVersion: number
  returnPeriod?: ProgramReturnPeriod | null
  loadOverrides?: ProgramLoadOverride[]
  /** Most recent explicit reset; history remains separate from current references. */
  lastLoadResetAt?: string | null
  loadAdjustments?: Array<{ createdAt: string; changes: import('./return').ProgramLoadChange[] }>
  /** Missing on legacy in-memory fixtures and pre-mode records; treated as standard. */
  equipmentMode?: ProgramEquipmentMode
  freeWeightPolicyVersionId?: string | null
  freeWeightChoicesHash?: string | null
  customizationStatus: ProgramCustomizationStatus
  customizationSummary: ProgramCustomizationSummary
  stateValues: ProgramStateInput[]
  movementOverrides?: ProgramMovementOverride[]
  accessoryAdditions?: ProgramAccessoryAddition[]
  equipmentModeChoices?: ProgramEquipmentModeChoice[]
  templateDefinition?: TemplateDefinition
}

export type ProgramMovementOverride = {
  id?: string
  programInstanceId?: string
  slotId: string
  phaseKey: string
  role: MovementRole
  originalMovementId: string
  replacementMovementId: string
  effectiveFromWeekIndex: number
}

export type ProgramAccessoryAddition = {
  id?: string
  programInstanceId?: string
  sessionId: string
  slotId: string
  phaseKey: string
  movementId: string
  prescriptionId: string
  sourceSlotId?: string | null
  targetSummary?: string | null
  sets?: SetTarget[]
  note?: string | null
  progressionMethod?: AccessoryProgressionMethod | null
  effectiveFromWeekIndex: number
  orderIndex: number
}

export type ProgramCustomizationSummary = {
  movementOverrideCount: number
  accessoryAdditionCount: number
}

export type ProgressionDecision = {
  id: string
  movementId: string
  movementName: string
  stateKey?: string | null
  stateType?: ProgramStateType | null
  ruleId: string
  scope: 'session' | 'week' | 'wave' | 'cycle' | 'block'
  status: 'pending' | 'accepted' | 'dismissed' | 'superseded'
  inputSummary: string
  recommendation: string
  /** Plain-language "why" behind the recommendation, shown in the coaching receipt. */
  rationale?: string | null
  previousValue?: number | null
  recommendedValue?: number | null
  /** When the decision was accepted/dismissed; null while pending. */
  resolvedAt?: string | null
}
