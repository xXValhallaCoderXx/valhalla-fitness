import { StepRail } from '~/components'
import {
  SETUP_STEPS,
  setupStepLabel,
  type SetupStepId,
} from '~/domains/program/lib/setup-steps'
import { useExperienceMode } from '~/domains/account/components'

/**
 * The four steps of setup, and where you are in them.
 *
 * Completed steps stay reachable — setup is reversible right up until Start, and making the lifter
 * retreat through Back to change one number would be worse than letting them jump. Steps ahead are
 * locked because setup cannot be answered out of order.
 */
export function TemplateStartStepRail({
  step,
  onSelect,
}: {
  step: SetupStepId
  onSelect: (step: SetupStepId) => void
}) {
  const { mode } = useExperienceMode()
  return (
    <StepRail
      label="Setup steps"
      steps={SETUP_STEPS.map((id) => ({ id, label: setupStepLabel(id, mode) }))}
      currentIndex={SETUP_STEPS.indexOf(step)}
      lockAhead
      onSelect={(id) => onSelect(id as SetupStepId)}
    />
  )
}
