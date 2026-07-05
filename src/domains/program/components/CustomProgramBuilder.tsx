import { ActionIcon, Badge, Button, Card, Tooltip } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Check, ChevronLeft, ChevronRight, Wand2, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Heading, Text } from '~/components'
import { meQueryOptions } from '~/domains/account/queries'
import { evaluateCustomProgramDraft, hasBlockingIssue } from '~/domains/program/lib/custom-builder-guidance'
import { customBuilderStepsFor, type CustomBuilderStep } from '~/domains/program/lib/custom-builder-ui'
import { createCustomProgramTemplateFn } from '~/domains/program/server/program-functions'
import { getApiErrorMessage } from '~/shared/lib/api-error'
import type { ProgramTemplateSummary } from '~/shared/types'
import { issuesForChecks } from './custom-builder/CustomBuilderGuidance'
import { BuilderStepNavigation, CurrentPlanSummary } from './custom-builder/CustomBuilderChrome'
import { CustomAccessoriesStep } from './custom-builder/CustomAccessoriesStep'
import { CustomLoggerExercisesStep } from './custom-builder/CustomLoggerExercisesStep'
import { CustomMethodologyStep } from './custom-builder/CustomMethodologyStep'
import { CustomMovementsStep } from './custom-builder/CustomMovementsStep'
import { CustomReviewStep } from './custom-builder/CustomReviewStep'
import { useCustomProgramDraft } from './custom-builder/useCustomProgramDraft'

export function CustomProgramBuilder({
  titleId,
  onClose,
  onCreated,
}: {
  titleId: string
  onClose: () => void
  onCreated: (template: ProgramTemplateSummary) => void | Promise<void>
}) {
  const [step, setStep] = useState<CustomBuilderStep>('methodology')
  const {
    draft,
    updateDraft,
    setMethodology,
    setDaysPerWeek,
    updateSession,
    updateAccessory,
    addAccessory,
    removeAccessory,
    updateLoggerExercise,
    addLoggerExercise,
    removeLoggerExercise,
  } = useCustomProgramDraft()
  const steps = customBuilderStepsFor(draft.methodology)
  const currentStepIndex = steps.findIndex((item) => item.id === step)
  const isReview = step === 'review'
  const mutation = useMutation({
    mutationFn: () => createCustomProgramTemplateFn({ data: draft }),
    onError: (error) => {
      notifications.show({
        color: 'danger',
        title: 'Could not create programme',
        message: getApiErrorMessage(error, 'Unable to create custom programme'),
      })
    },
    onSuccess: (template) => {
      void onCreated(template)
    },
  })

  const moveStep = (direction: 1 | -1) => {
    const next = steps[currentStepIndex + direction]
    if (next) setStep(next.id)
  }

  const meQuery = useQuery(meQueryOptions())
  const issues = useMemo(() => evaluateCustomProgramDraft(draft), [draft])
  const canCreate = !hasBlockingIssue(issues)

  return (
    <Card className="flex h-full max-h-[92dvh] flex-col overflow-hidden rounded-t-2xl rounded-b-none sm:max-h-[92dvh] sm:rounded-lg" p={0}>
      <div className="shrink-0 border-b p-3 sm:p-4" style={{ borderColor: 'var(--mantine-color-default-border)' }}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <div
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
              style={{ backgroundColor: 'var(--vf-action-soft)', border: '1px solid var(--vf-action-border)' }}
            >
              <Wand2 size={21} color="var(--vf-action-text)" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Heading id={titleId} order={2} size="h3" className="truncate">
                  Create programme
                </Heading>
                <Badge color="action">Custom</Badge>
              </div>
              <Text mt={3} size="sm" tone="dimmed">
                Build a constrained template from supported methodology presets.
              </Text>
            </div>
          </div>
          <Tooltip label="Close">
            <ActionIcon
              color="neutral"
              variant="subtle"
              size="lg"
              aria-label="Close"
              className="shrink-0"
              onClick={onClose}
              disabled={mutation.isPending}
            >
              <X size={18} />
            </ActionIcon>
          </Tooltip>
        </div>

        <BuilderStepNavigation
          steps={steps}
          currentStep={step}
          disabled={mutation.isPending}
          onStepChange={setStep}
        />
        {step !== 'methodology' ? <CurrentPlanSummary draft={draft} /> : null}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-4" style={{ backgroundColor: 'var(--mantine-color-body)' }}>
        {step === 'methodology' ? (
          <CustomMethodologyStep
            draft={draft}
            issues={issuesForChecks(issues, ['name', 'schedule_fit'])}
            onDraftChange={updateDraft}
            onMethodologyChange={setMethodology}
            onDaysChange={setDaysPerWeek}
          />
        ) : step === 'main_lifts' && draft.methodology === 'none' ? (
          <CustomLoggerExercisesStep
            draft={draft}
            issues={issuesForChecks(issues, ['logger_empty', 'session_count'])}
            onSessionChange={updateSession}
            onExerciseChange={updateLoggerExercise}
            onAddExercise={addLoggerExercise}
            onRemoveExercise={removeLoggerExercise}
          />
        ) : step === 'main_lifts' ? (
          <CustomMovementsStep
            draft={draft}
            issues={issuesForChecks(issues, ['duplicate_main', 'weekly_balance', 'session_count'])}
            onSessionChange={updateSession}
          />
        ) : step === 'accessories' && draft.methodology !== 'none' ? (
          <CustomAccessoriesStep
            draft={draft}
            issues={issuesForChecks(issues, ['accessory_volume'])}
            onAccessoryChange={updateAccessory}
            onAddAccessory={addAccessory}
            onRemoveAccessory={removeAccessory}
          />
        ) : (
          <CustomReviewStep draft={draft} issues={issues} profile={meQuery.data ?? null} />
        )}
      </div>

      <div
        className="shrink-0 border-t p-3 pb-[calc(1.75rem+env(safe-area-inset-bottom))] sm:p-4 sm:pb-3"
        style={{ borderColor: 'var(--mantine-color-default-border)' }}
      >
        <div className="flex items-center justify-between gap-3">
          <Button variant="default" className="shrink-0" disabled={mutation.isPending || currentStepIndex === 0} onClick={() => moveStep(-1)}>
            <ChevronLeft size={14} />
            Back
          </Button>
          {!isReview ? (
            <Button className="shrink-0" disabled={mutation.isPending} onClick={() => moveStep(1)}>
              Next
              <ChevronRight size={14} />
            </Button>
          ) : (
            <Button className="shrink-0" disabled={mutation.isPending || !canCreate} loading={mutation.isPending} onClick={() => mutation.mutate()}>
              <Check size={16} />
              Create programme
            </Button>
          )}
        </div>
      </div>
    </Card>
  )
}
