import { getApiErrorMessage } from '@sheetless/domain/shared/api-error'

export const WORKOUT_UNAVAILABLE_MESSAGE = 'Workout unavailable'

/** Error messages remain available across the web server-function boundary. */
export function isWorkoutUnavailable(error: unknown): boolean {
  return getApiErrorMessage(error, '') === WORKOUT_UNAVAILABLE_MESSAGE
}
