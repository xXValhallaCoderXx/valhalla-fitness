import type { UserProfile } from '~/domains/account'
import type { GuidanceIssue } from '~/domains/program/lib/custom-builder-guidance'
import type { CustomBuilderStep } from '~/domains/program/lib/custom-builder-ui'
import { CustomAccessoriesStep } from './CustomAccessoriesStep'
import { CustomLoggerExercisesStep } from './CustomLoggerExercisesStep'
import { CustomMethodologyStep } from './CustomMethodologyStep'
import { CustomMovementsStep } from './CustomMovementsStep'
import { CustomReviewStep } from './CustomReviewStep'
import { issuesForChecks } from './CustomBuilderGuidance'
import type { useCustomProgramDraft } from './useCustomProgramDraft'

/**
 * Which step is on screen.
 *
 * Split out of the page so the shell stays about layout and the mutation, and so each step keeps
 * being handed only the guidance checks it can actually act on.
 */
export function CustomBuilderStepBody({
  step,
  draftState,
  issues,
  profile,
}: {
  step: CustomBuilderStep
  draftState: ReturnType<typeof useCustomProgramDraft>
  issues: GuidanceIssue[]
  profile: UserProfile | null
}) {
  const { draft } = draftState

  if (step === 'methodology') {
    return (
      <CustomMethodologyStep
        draft={draft}
        issues={issuesForChecks(issues, ['name', 'schedule_fit'])}
        onDraftChange={draftState.updateDraft}
        onMethodologyChange={draftState.setMethodology}
        onDaysChange={draftState.setDaysPerWeek}
      />
    )
  }

  if (step === 'main_lifts' && draft.methodology === 'none') {
    return (
      <CustomLoggerExercisesStep
        draft={draft}
        issues={issuesForChecks(issues, ['logger_empty', 'session_count'])}
        onSessionChange={draftState.updateSession}
        onExerciseChange={draftState.updateLoggerExercise}
        onAddExercise={draftState.addLoggerExercise}
        onRemoveExercise={draftState.removeLoggerExercise}
      />
    )
  }

  if (step === 'main_lifts') {
    return (
      <CustomMovementsStep
        draft={draft}
        issues={issuesForChecks(issues, ['duplicate_main', 'weekly_balance', 'session_count'])}
        onSessionChange={draftState.updateSession}
      />
    )
  }

  if (step === 'accessories' && draft.methodology !== 'none') {
    return (
      <CustomAccessoriesStep
        draft={draft}
        issues={issuesForChecks(issues, ['accessory_volume'])}
        onAccessoryChange={draftState.updateAccessory}
        onAddAccessory={draftState.addAccessory}
        onRemoveAccessory={draftState.removeAccessory}
      />
    )
  }

  return <CustomReviewStep draft={draft} issues={issues} profile={profile} />
}
