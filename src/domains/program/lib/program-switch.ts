import type { TodayPayload } from '~/shared/types'

export function shouldConfirmProgramStart(today?: TodayPayload | null) {
  return today?.activeProgram?.status === 'active'
}