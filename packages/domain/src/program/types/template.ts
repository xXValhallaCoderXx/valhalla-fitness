import type { MovementRole, SessionHardness } from '@sheetless/domain/shared/types'

export type ProgramTemplateOrigin = 'system_default' | 'licensed_partner' | 'user_created'

export type ProgramStateType = 'training_max' | 'one_rep_max' | 'working_load' | 'five_rep_max' | 'manual'

export type ProgramStateRequirement = {
  key: string
  movementId: string
  type: ProgramStateType
  label?: string
}

export type TemplateLoadDefinition =
  | {
      kind: 'percent_of_state'
      stateKey?: string
      stateType: ProgramStateType
      percent: number
      percentMax?: number
      default: 'low' | 'high' | 'blank'
    }
  | {
      kind: 'state'
      stateKey?: string
      stateType: ProgramStateType
    }
  | {
      kind: 'fixed'
      kg: number
      lb?: number
    }
  | {
      kind: 'user_selected'
    }

export type TemplateSetDefinition = {
  targetLoad?: TemplateLoadDefinition
  targetReps?: number
  targetRepMin?: number
  targetRepMax?: number
  targetRir?: number | null
  targetRpe?: number | null
  isTopSet?: boolean
  isAmrap?: boolean
  isBackoff?: boolean
  label?: string
}

export type TemplatePrescriptionDefinition = {
  targetSummary: string
  progressionRuleId?: string
  sets: TemplateSetDefinition[]
}

export type TemplateMovementDefinition =
  | string
  | {
      default: string
      byPhase?: Record<string, string>
    }

export type TemplateSlotDefinition = {
  id: string
  role: MovementRole
  movementId: TemplateMovementDefinition
  prescriptionId: string
  anchorMovementId?: string
  targetSummary?: string
}

export type TemplateSessionDefinition = {
  id: string
  title: string
  estimatedMinutes: number
  slots: TemplateSlotDefinition[]
}

export type TemplateWeekDefinition = {
  label: string
  phaseKey: string
  phaseLabel: string
  waveLabel?: string
  focus?: string
  summary: string
  hardness: SessionHardness
  prescriptions: Record<string, TemplatePrescriptionDefinition>
}

export type TemplateDefinition = {
  schemaVersion: '2026.06.dsl'
  id: string
  name: string
  durationWeeks: number
  daysPerWeek: number
  requiredState: ProgramStateRequirement[]
  timelineDescription: string
  sessions: TemplateSessionDefinition[]
  weeks: TemplateWeekDefinition[]
  progressionRules?: Record<string, string>
  progressionConfig?: {
    simple_linear_completion?: {
      increments: Record<string, {
        kg: number
        lb: number
      }>
    }
  }
}

export type ProgramTemplateSummary = {
  id: string
  name: string
  source: 'linear_strength' | 'training_max_wave' | 'wave_powerbuilding' | 'volume_strength' | 'custom_program'
  sourceLabel: string
  origin: ProgramTemplateOrigin
  description: string
  daysPerWeek: number
  progressionLabel: string
  complexity: string
  tags: string[]
  requiredState: ProgramStateRequirement[]
  available: boolean
  /**
   * Presentational programme-family grouping. Sourced from `template-families.ts` and merged onto
   * summaries in both the fallback catalogue and the DB path; absent for custom/user templates.
   */
  familyId?: string
  variantLabel?: string
  variantShortLabel?: string
  variantDescription?: string
  variantSortOrder?: number
}
