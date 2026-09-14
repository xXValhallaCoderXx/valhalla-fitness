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
    // Pills joined by dashes, per the comp. They stay real buttons rather than the comp's inert
    // chips because a completed step is navigable — and the e2e clicks one.
    <ol className="mb-4 flex flex-wrap items-center gap-1.5" aria-label="Setup steps">
      {SETUP_STEPS.map((id, index) => {
        const position = setupStepPosition(id)
        const state = position === currentPosition ? 'current' : position < currentPosition ? 'done' : 'todo'
        return (
          <li key={id} className="flex items-center gap-1.5">
            {index ? (
              <span
                aria-hidden="true"
                className="h-px w-3.5 shrink-0"
                style={{ backgroundColor: 'var(--mantine-color-default-border)' }}
              />
            ) : null}
            <button
              type="button"
              disabled={state === 'todo'}
              aria-current={state === 'current' ? 'step' : undefined}
              onClick={() => onSelect(id)}
              className="flex items-center gap-2 px-3"
              style={{
                height: '1.875rem',
                borderRadius: 9999,
                border: `1px solid ${state === 'current' ? 'var(--vf-action-border)' : 'var(--mantine-color-default-border)'}`,
                background: state === 'current' ? 'var(--vf-action-soft)' : 'var(--mantine-color-default)',
                cursor: state === 'todo' ? 'default' : 'pointer',
                opacity: state === 'todo' ? 0.55 : 1,
                appearance: 'none',
              }}
            >
              {state === 'done' ? (
                <Check size={13} color="var(--vf-success-text)" />
              ) : (
                <Caption fw={800} tone={state === 'current' ? 'action' : 'dimmed'}>{position}</Caption>
              )}
              <Text
                component="span"
                size="xs"
                fw={state === 'current' ? 800 : 600}
                tone={state === 'current' ? 'action' : 'dimmed'}
              >
                {setupStepLabel(id, mode)}
              </Text>
            </button>
          </li>
        )
      })}
    </ol>
  )
}
