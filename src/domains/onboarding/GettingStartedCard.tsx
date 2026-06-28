import { Button } from '@mantine/core'
import { Link } from '@tanstack/react-router'
import { CheckCircle2, Circle, Sparkles } from 'lucide-react'
import { track } from '~/shared/lib/analytics'
import { Caption, Heading, Panel, SectionLabel, Text } from '~/components'
import type { OnboardingStep, OnboardingStepId } from './onboarding-progress'

/** Deep-link CTA for an incomplete step. Literal `to`/`search` keeps TanStack's typed links happy. */
function StepCta({ step }: { step: OnboardingStepId }) {
  if (step === 'plan') {
    return (
      <Link to="/templates" search={{ find: true }} className="block w-full sm:w-auto" onClick={() => track('onboarding_checklist_cta', { step })}>
        <Button size="xs" className="w-full sm:w-auto">Choose a plan</Button>
      </Link>
    )
  }
  if (step === 'estimates') {
    return (
      <Link to="/settings" search={{ focus: 'estimates' }} className="block w-full sm:w-auto" onClick={() => track('onboarding_checklist_cta', { step })}>
        <Button size="xs" className="w-full sm:w-auto">Set estimates</Button>
      </Link>
    )
  }
  return null
}

export function GettingStartedCard({
  steps,
  allDone,
  onStartTour,
  onSnooze,
  onDismiss,
  isDismissing,
}: {
  steps: OnboardingStep[]
  allDone: boolean
  onStartTour: () => void
  onSnooze: () => void
  onDismiss: () => void
  isDismissing: boolean
}) {
  return (
    <Panel data-tour="getting-started" className="mb-4" p="md" style={{ borderColor: 'var(--vf-action-border)' }}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <SectionLabel>Getting started</SectionLabel>
          <Heading order={2} size="h4" mt="xs">{allDone ? "You're all set \u{1F389}" : 'Welcome to Sheetless'}</Heading>
          <Text mt={4} size="sm" tone="dimmed">
            {allDone ? 'Nice work — you have everything you need to train.' : 'Three quick steps to your first workout.'}
          </Text>
        </div>
        <Button variant="default" size="xs" className="shrink-0" onClick={onStartTour}>
          <Sparkles size={14} />
          Take a quick tour
        </Button>
      </div>

      <div className="mt-4 grid gap-2">
        {steps.map((step) => (
          // Flex lives on a plain inner div: the same classes on the Mantine Paper (Panel)
          // are overridden by Mantine's layer, which would stack the CTA below the text.
          <Panel key={step.id} surface="inset" p="sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-start gap-3">
                {step.done ? (
                  <CheckCircle2 size={20} color="var(--vf-success-text)" className="mt-0.5 shrink-0" />
                ) : (
                  <Circle size={20} color="var(--mantine-color-dimmed)" className="mt-0.5 shrink-0" />
                )}
                <div className="min-w-0">
                  <Text fw={800} size="sm" td={step.done ? 'line-through' : undefined} tone={step.done ? 'dimmed' : undefined}>
                    {step.title}
                  </Text>
                  <Caption>{step.description}</Caption>
                </div>
              </div>
              {!step.done ? <StepCta step={step.id} /> : null}
            </div>
          </Panel>
        ))}
      </div>

      <div className="mt-3 flex justify-end gap-2">
        {!allDone ? (
          <Button variant="subtle" size="xs" color="neutral" onClick={onSnooze}>
            Skip for now
          </Button>
        ) : null}
        <Button variant="subtle" size="xs" color="neutral" onClick={onDismiss} disabled={isDismissing}>
          {allDone ? 'Done' : "Don't show again"}
        </Button>
      </div>
    </Panel>
  )
}
