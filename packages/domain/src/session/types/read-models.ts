import type {
  ProgramInstance,
  ProgressionDecision,
} from '@sheetless/domain/program/types'
import type {
  PlannedSession,
  SetLog,
  WorkoutSession,
} from '@sheetless/domain/session/types/session'
import type { EndedProgramSummary } from '@sheetless/domain/program/ending'
import type { ProgramCycleBoundary } from '@sheetless/domain/program/cycle-boundary'

export type TodayPayload = {
  cycleBoundary?: ProgramCycleBoundary | null
  /** Ancillary history failed; entry remains available and absence is not treated as a fresh account. */
  historyReadError?: string | null
  lastEndedProgram?: EndedProgramSummary | null
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
  cycleBoundary?: ProgramCycleBoundary | null
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
