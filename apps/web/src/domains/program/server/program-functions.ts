// Compatibility surface for existing callers. Programme server behavior lives
// in cohesive modules so this entry point cannot become another monolith.
export {
  getActiveProgramFn,
  getActiveProgramInternal,
  getPendingDecisionsInternal,
  resolveProgressionDecisionFn,
  resolveProgressionDecisionsFn,
} from '~/domains/program/server/active-program-functions'
export {
  getProgramSetupOptionsFn,
  listTemplatesFn,
} from '~/domains/program/server/program-template-functions'
export {
  createCustomProgramTemplateFn,
  startProgramFn,
} from '~/domains/program/server/program-start-functions'
export {
  previewProgramEquipmentModeFn,
  setProgramEquipmentModeFn,
} from '~/domains/program/server/program-equipment-mode-functions'
