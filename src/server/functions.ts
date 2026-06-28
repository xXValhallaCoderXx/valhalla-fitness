// Grouped view of client-callable TanStack server functions.
// Domain code should generally import from src/domains/*/server/*-functions directly.
export { dismissLiveOnboardingFn, getMeFn, updateSettingsFn } from '~/domains/account/server/profile-functions'
export { listAccessoryMovementOptionsFn } from '~/domains/movement/server/movement-functions'
export {
  createCustomProgramTemplateFn,
  getActiveProgramFn,
  getProgramSetupOptionsFn,
  listTemplatesFn,
  resolveProgressionDecisionFn,
  startProgramFn,
} from '~/domains/program/server/program-functions'
export {
  addExerciseSetFn,
  addSessionAccessoryFn,
  finishSessionFn,
  getSessionFn,
  getTodayFn,
  listMovementSwapOptionsFn,
  startSessionFn,
  substituteMovementFn,
  upsertSetLogFn,
} from '~/domains/session/server/session-functions'
export {
  getHistoryDashboardFn,
  getMovementHistoryFn,
  getProgramOverviewFn,
  getRecentHistoryFn,
} from '~/domains/history/server/history-functions'
