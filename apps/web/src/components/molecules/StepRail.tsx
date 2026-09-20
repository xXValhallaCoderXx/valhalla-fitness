import { Check } from 'lucide-react'
import { Caption, Text } from '~/components/atoms'

export type StepRailItem = {
  id: string
  label: string
}

/**
 * Pills joined by dashes: the steps of a wizard, and where you are in them.
 *
 * Shared by programme setup and the custom builder, which draw the same rail in the v3 comps. They
 * stay real buttons rather than the comp's inert chips because a completed step is navigable.
 * `lockAhead` is the one difference between the two: setup cannot be answered out of order, the
 * builder can.
 */
export function StepRail({
  steps,
  currentIndex,
  label,
  lockAhead = false,
  disabled = false,
  onSelect,
}: {
  steps: StepRailItem[]
  currentIndex: number
  /** Accessible name for the list, e.g. "Setup steps". */
  label: string
  /** Steps after the current one cannot be reached. */
  lockAhead?: boolean
  /** Every step is unreachable — the page is busy. */
  disabled?: boolean
  onSelect: (id: string) => void
}) {
  return (
    <ol className="mb-4 flex flex-wrap items-center gap-1.5" aria-label={label}>
      {steps.map((step, index) => {
        const state = index === currentIndex ? 'current' : index < currentIndex ? 'done' : 'todo'
        const locked = disabled || (lockAhead && state === 'todo')
        return (
          <li key={step.id} className="flex items-center gap-1.5">
            {index ? (
              <span
                aria-hidden="true"
                className="h-px w-3.5 shrink-0"
                style={{ backgroundColor: 'var(--mantine-color-default-border)' }}
              />
            ) : null}
            <button
              type="button"
              disabled={locked}
              aria-current={state === 'current' ? 'step' : undefined}
              onClick={() => onSelect(step.id)}
              className="flex items-center gap-2 px-3"
              style={{
                height: '1.875rem',
                borderRadius: 9999,
                border: `1px solid ${stepBorder(state)}`,
                background: stepBackground(state),
                cursor: locked ? 'default' : 'pointer',
                opacity: locked ? 0.55 : 1,
                appearance: 'none',
              }}
            >
              {state === 'done' ? (
                <Check size={13} color="var(--vf-success-text)" />
              ) : (
                <Caption fw={800} tone={state === 'current' ? 'action' : 'dimmed'}>{index + 1}</Caption>
              )}
              <Text
                component="span"
                size="xs"
                fw={state === 'current' ? 800 : 600}
                tone={state === 'current' ? 'action' : state === 'done' ? 'success' : 'dimmed'}
              >
                {step.label}
              </Text>
            </button>
          </li>
        )
      })}
    </ol>
  )
}

function stepBorder(state: 'current' | 'done' | 'todo') {
  if (state === 'current') return 'var(--vf-action-border)'
  if (state === 'done') return 'var(--vf-success-border)'
  return 'var(--mantine-color-default-border)'
}

function stepBackground(state: 'current' | 'done' | 'todo') {
  if (state === 'current') return 'var(--vf-action-soft)'
  if (state === 'done') return 'var(--vf-success-soft)'
  return 'var(--mantine-color-default)'
}
