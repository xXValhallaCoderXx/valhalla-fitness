import { Button } from '@mantine/core'
import { Link } from '@tanstack/react-router'
import { CheckCircle2, Circle, Sparkles } from 'lucide-react'
import { Caption, Heading, Panel, SectionLabel, Text } from '~/components'
import type { OnboardingStep, OnboardingStepId } from './onboarding-progress'

const STEP_LINKS: Partial<Record<OnboardingStepId, { to: string; cta: string }>> = {
  plan: { to: '/templates', cta: 'Choose a plan' },
  estimates: { to: '/settings', cta: 'Set estimates' },
}

export function GettingStartedCard({
  steps,
  allDone,
  onStartTour,
  onDismiss,
  isDismissing,
}: {
  steps: OnboardingStep[]
  allDone: boolean
  onStartTour: () => void
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
        {steps.map((step) => {
          const link = STEP_LINKS[step.id]
          return (
            <Panel key={step.id} surface="inset" p="sm" className="flex items-center justify-between gap-3">
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
              {!step.done && link ? (
                <Link to={link.to} className="shrink-0">
                  <Button size="xs">{link.cta}</Button>
                </Link>
              ) : null}
            </Panel>
          )
        })}
      </div>

      <div className="mt-3 flex justify-end">
        <Button variant="subtle" size="xs" color="neutral" onClick={onDismiss} disabled={isDismissing}>
          {allDone ? 'Done' : 'Dismiss'}
        </Button>
      </div>
    </Panel>
  )
}
