import { Badge } from '@mantine/core'
import { Caption, Panel, StepRail, Text } from '~/components'
import { customProgramMethodologies, type CustomProgramBuilderInput } from '~/domains/program/lib/custom-program-meta'
import type { CustomBuilderStep } from '~/domains/program/lib/custom-builder-ui'

/**
 * The wizard's steps, as the shared pill rail.
 *
 * Unlike setup, every step is reachable at any time: the builder's answers are independent, and
 * jumping back to swap a lift after reaching Review should not cost three clicks.
 */
export function BuilderStepNavigation({
  steps,
  currentStep,
  disabled,
  onStepChange,
}: {
  steps: Array<{ id: CustomBuilderStep; label: string }>
  currentStep: CustomBuilderStep
  disabled: boolean
  onStepChange: (step: CustomBuilderStep) => void
}) {
  return (
    <StepRail
      label="Builder steps"
      steps={steps}
      currentIndex={steps.findIndex((item) => item.id === currentStep)}
      disabled={disabled}
      onSelect={(id) => onStepChange(id as CustomBuilderStep)}
    />
  )
}

export function CurrentPlanSummary({ draft }: { draft: CustomProgramBuilderInput }) {
  const methodology = customProgramMethodologies[draft.methodology]
  return (
    <Panel surface="inset" className="mt-3" px="sm" py="xs">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <Text size="xs" fw={900} truncate className="max-w-full sm:max-w-[16rem]">
          {draft.name.trim() || 'Untitled programme'}
        </Text>
        <Badge color={draft.methodology === 'none' ? 'neutral' : 'action'}>{methodology.shortLabel}</Badge>
        <Caption fw={700}>{draft.daysPerWeek} days/week</Caption>
        {draft.goal?.trim() ? (
          <Caption fw={700} truncate className="max-w-full sm:max-w-[24rem]">
            Goal: {draft.goal.trim()}
          </Caption>
        ) : null}
      </div>
    </Panel>
  )
}
