import type { TodayPayload } from '~/types/training'

export function shouldConfirmProgramStart(today?: TodayPayload | null) {
  return today?.activeProgram?.status === 'active'
}