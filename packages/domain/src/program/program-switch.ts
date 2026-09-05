import type { TodayPayload } from '@sheetless/domain/session/types'

export function shouldConfirmProgramStart(today?: TodayPayload | null) {
  return today?.activeProgram?.status === 'active'
}