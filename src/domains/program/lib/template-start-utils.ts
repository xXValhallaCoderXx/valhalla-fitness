import { getMovementName } from '~/domains/movement/lib/movements'
import {
  DEFAULT_TRAINING_MAX_PERCENT,
  DEFAULT_WORKING_LOAD_PERCENT,
  buildProgramStartStateValues,
} from '~/domains/program/lib/program-loads'
import type {
  MovementRole,
  ProgramSetupOptions,
  ProgramStartAccessoryAdditionInput,
  ProgramStateInput,
  ProgramTemplateSummary,
  Unit,
  UserProfile,
} from '~/shared/types'

export type AccessoryAdditionDraft = ProgramStartAccessoryAdditionInput & {
  clientId: string
}

export type WeekPreviewOption = {
  key: string
  week: ProgramSetupOptions['previewWeeks'][number]
  weeks: ProgramSetupOptions['previewWeeks']
  label: string
  detail: string | null
}

export function stateValuesForProfileTemplate(
  template: ProgramTemplateSummary,
  profile: UserProfile,
  trainingMaxPercent = DEFAULT_TRAINING_MAX_PERCENT,
  workingLoadPercent = DEFAULT_WORKING_LOAD_PERCENT,
): ProgramStateInput[] {
  if (!template.requiredState.length) return []
  return buildProgramStartStateValues({
    unit: profile.units,
    requiredState: template.requiredState,
    defaults: profile.programStateDefaults,
    rounding: profile.rounding,
    trainingMaxPercent,
    workingLoadPercent,
  })
}

export function hasUsableStateValue(value: number | null) {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
}

export function loadValueFromInput(value: string) {
  if (!value.trim()) return null
  const numeric = Number(value)
  return Number.isFinite(numeric) && numeric > 0 ? numeric : null
}

export function formatStateType(value: string) {
  return value.replaceAll('_', ' ')
}

export function formatNumber(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1)
}

export function defaultsSummary(units: Unit, rounding: number, stateValues: ProgramStateInput[]) {
  const missingCount = stateValues.filter((state) => !hasUsableStateValue(state.value)).length
  const valueSummary = stateValues.length
    ? missingCount
      ? `${missingCount} value${missingCount === 1 ? '' : 's'} unset`
      : `${stateValues.length} starting value${stateValues.length === 1 ? '' : 's'} ready`
    : 'no starting values required'
  return `${units} - round ${rounding} - ${valueSummary}`
}

export function missingRequiredLoadMessage(stateValues: ProgramStateInput[]) {
  const labels = stateValues.map((state) => getMovementName(state.movementId))
  return `Missing strength estimate${labels.length === 1 ? '' : 's'} for ${labels.join(', ')}. Open Settings > Strength Estimates before choosing programme ${programmeValueLabel(stateValues)}.`
}

export function programmeValueLabel(stateValues: ProgramStateInput[]) {
  if (stateValues.some((state) => state.type === 'working_load')) return 'working loads'
  if (stateValues.some((state) => state.type === 'training_max')) return 'training maxes'
  return 'starting values'
}

export function compactWeekPreviewOptions(weeks: ProgramSetupOptions['previewWeeks']): WeekPreviewOption[] {
  const groups = new Map<string, ProgramSetupOptions['previewWeeks']>()
  for (const week of weeks) {
    const key = previewWeekPatternKey(week)
    groups.set(key, [...(groups.get(key) ?? []), week])
  }

  const groupEntries = Array.from(groups.entries())
  return groupEntries.map(([key, groupedWeeks], index) => {
    const week = groupedWeeks[0]!
    return {
      key,
      week,
      weeks: groupedWeeks,
      label: compactWeekOptionLabel(week, groupedWeeks, index, groupEntries.length),
      detail: compactWeekOptionDetail(groupedWeeks),
    }
  })
}

function previewWeekPatternKey(week: ProgramSetupOptions['previewWeeks'][number]) {
  return week.sessions
    .map((session) =>
      session.movements
        .map((movement) => `${movement.role}:${movement.defaultMovementId}`)
        .join(','),
    )
    .join('|')
}

function compactWeekOptionLabel(
  week: ProgramSetupOptions['previewWeeks'][number],
  weeks: ProgramSetupOptions['previewWeeks'],
  index: number,
  totalGroups: number,
) {
  if (weeks.length <= 1) return week.label
  if (totalGroups === 1) return 'Exercise layout'
  const phaseLabels = new Set(weeks.map((item) => item.phaseLabel))
  if (phaseLabels.size === 1) {
    const phase = week.phaseLabel.replace(/\s+phase$/i, '')
    return `${phase} layout`
  }
  return `Layout ${index + 1}`
}

function compactWeekOptionDetail(weeks: ProgramSetupOptions['previewWeeks']) {
  if (weeks.length <= 1) return null
  const weekRange = `${weeks[0]!.label}${weeks.length > 1 ? `-${weeks.at(-1)!.label}` : ''}`
  if (weeks.length === 2) return `Same exercises across ${weekRange}; sets and loading may vary.`
  return `Same exercises across ${weeks.length} weeks; sets and loading may vary.`
}

export function weekOptionHeading(option: WeekPreviewOption | undefined) {
  if (!option) return 'Week plan'
  if (option.weeks.length <= 1) return option.week.label
  return `${option.label}`
}

export function isSetupConfigurableRole(role: MovementRole): role is Extract<MovementRole, 'variation' | 'accessory'> {
  return role === 'variation' || role === 'accessory'
}

export function accessoryDraftClientId(addition: ProgramStartAccessoryAdditionInput) {
  return `${addition.sessionId}-${addition.sourceSlotId}-${addition.movementId}-${Date.now()}-${Math.random().toString(36).slice(2)}`
}
