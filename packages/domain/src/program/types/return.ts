import type { ProgramStateType } from './template'
import type { SetTarget } from '../../session/types'

export type ReturnStage = {
  workouts: number
  setFraction: number
  /** Exact slot IDs; structural floors still apply. */
  setCounts: Record<string, number>
}

export type ReturnSettings = {
  stages: ReturnStage[]
  minimumRir: number
  defaultCap: number
  /** Caps are changes to programme load references in programme units. */
  caps: Record<string, number>
}

export type ProgramReturnPeriod = {
  id: string
  policyVersion: 1
  status: 'active' | 'review' | 'completed' | 'cancelled'
  startedAt: string
  completedWorkouts: number
  settings: ReturnSettings
}

export type FixedLoadSelector = {
  templateSessionId: string
  slotId: string
  weekIndex: number
  movementId: string
  setIndex: number
}

export type ProgramLoadOverride = {
  key: string
  selector: FixedLoadSelector
  value: number
}

export type ProgramLoadChange = {
  key: string
  kind: 'state' | 'fixed' | 'accessory'
  label: string
  before: number
  after: number | null
  selector?: FixedLoadSelector
  accessoryId?: string
  setIndex?: number
}

export type ReturnStateBinding = {
  stateKey: string
  stateType: ProgramStateType
  value: number
}

export type ReturnSessionContext = {
  policyVersion: 1
  periodId: string
  startedAt: string
  completedWorkouts: number
  stageIndex: number
  stageWorkout: number
  stageWorkouts: number
  review: boolean
  minimumRir: number
  defaultCap: number
  caps: Record<string, number>
  slots: Record<
    string,
    {
      movementId: string
      progressionRuleId: string | null
      originalCount: number
      retainedSourceIndices: number[]
      targets: SetTarget[]
      binding: ReturnStateBinding | null
    }
  >
}
