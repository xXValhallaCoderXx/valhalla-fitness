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
  lastWorkoutLogged?: string | null
  activeProgram: ProgramInstance | null
  plannedSession: PlannedSession | null
  activeSession: WorkoutSession | null
  /** A session finished *today*; drives the "next session" framing. Not the same as the one below. */
  completedSession: WorkoutSession | null
  /** The most recent finished workout whenever it happened — the Today "Last session" card. */
  lastCompletedSession?: WorkoutSession | null
  pendingDecisions: ProgressionDecision[]
  /** Newest accepted progression per state key, for the per-row "why this load moved" reason. */
  acceptedDecisions?: ProgressionDecision[]
}

export type SessionSummary = {
  session: WorkoutSession
  completedSets: number
  totalSets: number
  topSets: SetLog[]
  accessoryOutcomes: string[]
  decisions: ProgressionDecision[]
  /** False for older workouts whose exact decision provenance was not recorded. */
  decisionReceiptAvailable?: boolean
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
