// Compatibility surface for existing callers. Session server behavior lives in
// cohesive modules so this entry point stays safe to import from route/query code.
export {
  getSessionFn,
  getSessionInternal,
  getTodayFn,
  getTodayInternal,
} from '~/domains/session/server/session-read-functions'
export {
  discardSessionFn,
  renameSessionFn,
  startAdHocSessionFn,
  startSessionFn,
} from '~/domains/session/server/session-lifecycle-functions'
export { finishSessionFn } from '~/domains/session/server/session-completion-functions'
export {
  addExerciseSetFn,
  upsertSetLogFn,
} from '~/domains/session/server/session-set-functions'
export {
  addSessionAccessoryFn,
  removeSessionAccessoryFn,
  reorderSessionAccessoriesFn,
} from '~/domains/session/server/session-accessory-functions'
export {
  addAdHocExerciseFn,
  removeAdHocExerciseFn,
} from '~/domains/session/server/session-ad-hoc-functions'
export {
  listMovementSwapOptionsFn,
  substituteMovementFn,
} from '~/domains/session/server/session-movement-functions'
