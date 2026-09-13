import type { SetPatch } from './session-cache'
import type { SetLog } from './types/session'

export type SetLogAttempt = SetPatch & { reconcileBeforeSave?: boolean }

const valueKeys = ['actualLoad', 'actualReps', 'actualRir', 'actualRpe', 'note', 'completed'] as const

/** Compare the complete persisted intent, treating absent optional values as null. */
export function sameSetLogValues(left: SetPatch, right: SetPatch): boolean {
  return valueKeys.every((key) => (left[key] ?? null) === (right[key] ?? null))
}

/** Exact retries retain their receipt; corrections receive a new identity. */
export function prepareSetLogAttempt(
  set: SetLog | undefined,
  patch: SetPatch,
  createId: () => string,
): SetLogAttempt {
  const values: SetPatch = {
    ...patch,
    actualLoad: patch.actualLoad === undefined ? set?.actualLoad ?? null : patch.actualLoad,
    actualReps: patch.actualReps === undefined ? set?.actualReps ?? null : patch.actualReps,
    actualRir: patch.actualRir === undefined ? set?.actualRir ?? null : patch.actualRir,
    actualRpe: patch.actualRpe === undefined ? set?.actualRpe ?? null : patch.actualRpe,
    note: (patch.note === undefined ? set?.note ?? null : patch.note)?.trim() ?? null,
    completed: patch.completed ?? set?.completed ?? false,
  }
  const failed = set?.syncState === 'syncFailed'
  const exactRetry = failed && sameSetLogValues(set, values)
  return {
    ...values,
    clientMutationId: exactRetry && set.clientMutationId
      ? set.clientMutationId
      : patch.clientMutationId && patch.clientMutationId !== set?.clientMutationId
        ? patch.clientMutationId
        : createId(),
    reconcileBeforeSave: failed,
  }
}
