import { Badge } from '@mantine/core'
import { Check } from 'lucide-react'
import { Caption, Panel, Text } from '~/components'
import { customProgramMethodologies, type CustomProgramBuilderInput } from '~/domains/program/lib/custom-templates'
import type { CustomBuilderStep } from '~/domains/program/lib/custom-builder-ui'

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
  const currentIndex = steps.findIndex((item) => item.id === currentStep)
  return (
    <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1 no-scrollbar md:mt-4 md:gap-2">
      {steps.map((item, index) => (
        <BuilderStepTab
          key={item.id}
          index={index}
          label={item.label}
          active={currentStep === item.id}
          done={index < currentIndex}
          disabled={disabled}
          onClick={() => onStepChange(item.id)}
        />
      ))}
    </div>
  )
}

function BuilderStepTab({
  index,
  label,
  active,
  done,
  disabled,
  onClick,
}: {
  index: number
  label: string
  active: boolean
  done: boolean
  disabled: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      className="flex min-h-9 shrink-0 items-center gap-2 rounded-full border px-3 transition-colors md:min-w-0 md:flex-1"
      style={{
        backgroundColor: active ? 'var(--vf-action-soft)' : 'var(--mantine-color-default)',
        borderColor: active ? 'var(--vf-action-border)' : 'var(--mantine-color-default-border)',
        opacity: disabled ? 0.55 : 1,
      }}
      disabled={disabled}
      onClick={onClick}
    >
      <span
        className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full"
        style={{
          backgroundColor: done ? 'var(--vf-success-text)' : active ? 'var(--vf-action-text)' : 'var(--vf-surface-3)',
          color: done || active ? 'var(--mantine-color-white)' : 'var(--mantine-color-dimmed)',
          fontSize: '0.625rem',
          fontWeight: 800,
        }}
      >
        {done ? <Check size={12} strokeWidth={3} /> : index + 1}
      </span>
      <Caption component="span" fw={800} truncate c={active ? 'var(--vf-action-text)' : undefined}>
        {label}
      </Caption>
    </button>
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
