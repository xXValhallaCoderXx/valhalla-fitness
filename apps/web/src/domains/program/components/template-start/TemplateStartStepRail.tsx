import { Check } from 'lucide-react'
import {
  SETUP_STEPS,
  setupStepLabel,
  setupStepPosition,
  type SetupStepId,
} from '~/domains/program/lib/setup-steps'
import { useExperienceMode } from '~/domains/account/components'
import { Caption, Text } from '~/components'

/**
 * The four steps, and where you are in them.
 *
 * Completed steps stay reachable — setup is reversible right up until Start, and making the lifter
 * retreat through Back to change one number would be worse than letting them jump.
 */
export function TemplateStartStepRail({
  step,
  onSelect,
}: {
  step: SetupStepId
  onSelect: (step: SetupStepId) => void
}) {
  const { mode } = useExperienceMode()
  const currentPosition = setupStepPosition(step)

  return (
    <ol className="mb-4 flex flex-wrap gap-2" aria-label="Setup steps">
      {SETUP_STEPS.map((id) => {
        const position = setupStepPosition(id)
        const state = position === currentPosition ? 'current' : position < currentPosition ? 'done' : 'todo'
        return (
          <li key={id}>
            <button
              type="button"
              disabled={state === 'todo'}
              aria-current={state === 'current' ? 'step' : undefined}
              onClick={() => onSelect(id)}
              className="flex items-center gap-2 rounded-md px-3 py-2"
              style={{
                border: '1px solid var(--mantine-color-default-border)',
                background: state === 'current' ? 'var(--vf-action-soft)' : 'none',
                cursor: state === 'todo' ? 'default' : 'pointer',
                opacity: state === 'todo' ? 0.55 : 1,
                appearance: 'none',
              }}
            >
              {state === 'done' ? (
                <Check size={13} color="var(--vf-success-text)" />
              ) : (
                <Caption fw={800}>{position}</Caption>
              )}
              <Text component="span" size="xs" fw={800}>
                {setupStepLabel(id, mode)}
              </Text>
            </button>
          </li>
        )
      })}
    </ol>
  )
}
