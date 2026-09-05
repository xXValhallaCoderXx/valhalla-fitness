import type { BodyLoadSummary } from '@sheetless/domain/history/types'
import type { MovementRole, SessionHardness, Unit } from '@sheetless/domain/shared/types'
import type {
  ProgramInstance,
  ProgressionDecision,
} from '@sheetless/domain/program/types/core'
import type { ProgramStateType } from '@sheetless/domain/program/types/template'
import type { ProgramEquipmentMode } from '@sheetless/domain/program/types/equipment-mode'

export type ProgramRecentSessionSummary = {
  id: string
  title: string
  completedAt?: string | null
  scheduledDate: string
  timeZone?: string | null
  weekLabel?: string | null
  equipmentMode?: ProgramEquipmentMode
  completedSetCount: number
  plannedSetCount: number
  topSetHighlights: string[]
}

export type ProgramSessionStamp = {
  /** Global session index at the time the session was planned (snapshot weekIndex). */
  weekIndex: number
  completedAt: string
}

export type ProgramStateOverview = {
  movementId: string
  movementName: string
  stateKey: string
  stateType: ProgramStateType
  label?: string | null
  value: number
  units: Unit
  /** Value at program start, reconstructed from the earliest accepted progression decision. */
  startValue: number
  /** Explicit load edits, excluded from earned-progression deltas. */
  resetDelta?: number
  updatedAt?: string | null
  pendingDecision?: ProgressionDecision | null
  lastAcceptedDecision?: ProgressionDecision | null
}

export type ProgramAccessoryPlan = {
  sessionTitle: string
  slots: Array<{
    slotId: string
    movementId: string
    movementName: string
    role: MovementRole
    targetSummary: string
    replacedMovementName?: string | null
    isAdded?: boolean
  }>
}

export type ProgramOverview = {
  activeProgram: ProgramInstance | null
  /** Any live workout blocks programme-level equipment changes until it ends. */
  hasActiveSession: boolean
  position: {
    phaseKey: string
    phaseLabel: string
    waveLabel?: string | null
    weekLabel: string
    weekSummary: string
    focus: string
    hardness: SessionHardness | null
    weekNumber: number
    totalWeeks: number
    sessionNumber: number
    daysPerWeek: number
    progressPercent: number
  } | null
  nextSession: {
    title: string
    scheduledDate: string
    mainMovementName: string
    movementSummary: string
    keyPrescription: string
    movements: Array<{
      role: MovementRole
      movementName: string
      targetSummary: string
    }>
    mainCount: number
    variationCount: number
    accessoryCount: number
    status: 'planned' | 'in_progress' | 'completed'
    href: string
  } | null
  recentSessions: ProgramRecentSessionSummary[]
  stateValues: ProgramStateOverview[]
  accessoryPlan: ProgramAccessoryPlan[]
  bodyLoad: BodyLoadSummary
  pendingDecisions: ProgressionDecision[]
  /** Full accepted-decision history for this program, newest first. */
  acceptedDecisions: ProgressionDecision[]
  /** Completed program sessions: global session index + completion time, for phase attribution. */
  sessionStamps: ProgramSessionStamp[]
}
