// Generate a concrete session plan (prescribed sets with weights) from a lift's TM
// and the current week of the cycle. See docs/Ultimate-workout-plan.md §5.

import type { LiftId, WeekName } from './types'
import { CYCLE_WEEKS, FSL_SETS, ROUNDING_KG, TOP_SET_NOTE } from './program-config'
import { setWeight } from './math'

export interface PrescribedSet {
  pct: number
  targetReps: number
  weight: number
  isTopSet: boolean
  /** Extra reps allowed (capped at RPE 8). Always false for bench. */
  isAmrap: boolean
  /** For top sets: the floor the progression engine reads. */
  minReps?: number
  note?: string
}

export interface SessionPlan {
  lift: LiftId
  weekName: WeekName
  weekIndex: number
  weekLabel: string
  isDeload: boolean
  mainSets: PrescribedSet[]
  fslSets: PrescribedSet[]
}

export const WEEK_COUNT = CYCLE_WEEKS.length // 4

/** weekIndex: 0=5s, 1=3s, 2=5/3/1, 3=deload. */
export function generateSessionPlan(
  lift: LiftId,
  tm: number,
  weekIndex: number,
  rounding: number = ROUNDING_KG,
): SessionPlan {
  const week = CYCLE_WEEKS[weekIndex]
  if (!week) throw new Error(`Invalid weekIndex: ${weekIndex}`)
  const isBench = lift === 'bench'

  const mainSets: PrescribedSet[] = week.sets.map((s) => {
    const isTopSet = Boolean(s.top)
    return {
      pct: s.pct,
      targetReps: s.reps,
      weight: setWeight(tm, s.pct, rounding),
      isTopSet,
      // Bench is never AMRAP, even on top sets (shoulder gate).
      isAmrap: Boolean(s.amrap) && !isBench,
      minReps: isTopSet ? s.min : undefined,
      note: isTopSet ? TOP_SET_NOTE[lift] : undefined,
    }
  })

  const fslSets: PrescribedSet[] = []
  if (week.fsl) {
    const count = FSL_SETS[lift]
    const weight = setWeight(tm, week.fsl.pct, rounding)
    for (let i = 0; i < count; i++) {
      fslSets.push({
        pct: week.fsl.pct,
        targetReps: week.fsl.reps,
        weight,
        isTopSet: false,
        isAmrap: false,
        note: i === 0 ? 'First-Set-Last back-off — same weight every set, crisp reps.' : undefined,
      })
    }
  }

  return {
    lift,
    weekName: week.name,
    weekIndex,
    weekLabel: week.label,
    isDeload: week.name === 'deload',
    mainSets,
    fslSets,
  }
}
