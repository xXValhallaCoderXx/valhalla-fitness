import type {
  ProgramInstance,
  ProgressionDecision,
} from '@sheetless/domain/program/types'
import type {
  PlannedSession,
  SetLog,
  WorkoutSession,
} from '@sheetless/domain/session/types/session'

export type TodayPayload = {
  activeProgram: ProgramInstance | null
  plannedSession: PlannedSession | null
  activeSession: WorkoutSession | null
  completedSession: WorkoutSession | null
  pendingDecisions: ProgressionDecision[]
}

export type SessionSummary = {
  session: WorkoutSession
  completedSets: number
  totalSets: number
  topSets: SetLog[]
  accessoryOutcomes: string[]
  decisions: ProgressionDecision[]
}

/** A favourited ad-hoc session, listed on the Plans page as a restartable workout. */
export type FavoriteWorkout = {
  sessionId: string
  title: string
  movementNames: string[]
  movementCount: number
  setCount: number
  scheduledDate: string | null
  completedAt: string | null
  timeZone?: string | null
}
