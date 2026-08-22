import type { TodayPayload } from '~/domains/session'

export function shouldConfirmProgramStart(today?: TodayPayload | null) {
  return today?.activeProgram?.status === 'active'
}