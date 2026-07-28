import type {
  ProgramInstance,
  ProgressionDecision,
} from '~/domains/program'
import type {
  PlannedSession,
  SetLog,
  WorkoutSession,
} from '~/domains/session/types/session'

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
  completedAt: string | null
}
