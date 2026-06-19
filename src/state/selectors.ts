// Derived, read-only views over AppState for the screens.

import type { AppState } from './types'
import type { LiftId, SessionType } from '@/engine/types'
import { localWeekday } from '@/lib/date'
import { liftForSession } from '@/engine/schedule'
import { generateSessionPlan, type SessionPlan } from '@/engine/cycle'
import { CYCLE_WEEKS } from '@/engine/program-config'

export interface TodayInfo {
  sessionType: SessionType
  lift: LiftId | null
  cycleIndex: number
  weekIndex: number
  weekLabel: string
  /** null when it isn't a lift day, or the lift's TM hasn't been seeded. */
  plan: SessionPlan | null
  tm: number | null
}

export function selectToday(state: AppState, date: Date = new Date()): TodayInfo {
  const dow = localWeekday(date)
  const sessionType = state.config.schedule[String(dow)] ?? 'rest'
  const lift = liftForSession(sessionType)
  const { cycleIndex, weekIndex } = state.cyclePointer
  const weekLabel = CYCLE_WEEKS[weekIndex]?.label ?? ''

  let plan: SessionPlan | null = null
  let tm: number | null = null
  if (lift) {
    tm = state.lifts[lift].trainingMax
    if (tm != null) plan = generateSessionPlan(lift, tm, weekIndex, state.config.roundingKg)
  }
  return { sessionType, lift, cycleIndex, weekIndex, weekLabel, plan, tm }
}
