import type { Unit } from '@sheetless/domain/shared/types'
import type { BodyLoadSummary, HistoryWeeklyVolume } from '@sheetless/domain/history/types/dashboard'
import type { ConsistencySummary } from '@sheetless/domain/history/types/insights'

export type * from './types/dashboard'
export type * from './types/insights'

/** Small, recent read model used by Today and first-run onboarding. */
export type TodayHistorySupport = {
  hasCompletedSessions: boolean
  units: Unit | null
  bodyLoad: BodyLoadSummary
  weeklyVolume: HistoryWeeklyVolume[]
  consistency: ConsistencySummary
}
