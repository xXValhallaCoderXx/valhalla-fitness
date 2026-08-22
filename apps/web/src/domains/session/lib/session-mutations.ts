const sessionMutationNames = new Set([
  'setLog',
  'addExerciseSet',
  'substituteMovement',
  'addSessionAccessory',
  'addAdHocExercise',
  'removeAdHocExercise',
  'reorderSessionAccessories',
  'removeSessionAccessory',
  'renameSession',
  'finishSession',
  'discardSession',
])

export function isSessionMutationKey(key: readonly unknown[] | undefined, sessionId: string) {
  return Boolean(
    key
    && key[1] === sessionId
    && sessionMutationNames.has(String(key[0])),
  )
}
