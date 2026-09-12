import { Badge, Button } from '@mantine/core'
import { ArrowLeft, ArrowRight, Check, Info } from 'lucide-react'
import type { ReactNode } from 'react'
import { Caption, MobileActionBar, Page, PageHeader, Panel, Text } from '~/components'
import { blockerForStep, continueToLabel, setupStepPosition } from '~/domains/program/lib/setup-steps'
import type { UserProfile } from '~/domains/account'
import type { ProgramSetupOptions, ProgramTemplateSummary } from '~/domains/program'
import type { LiftE1rmSeries } from '~/domains/history'
import type { TodayPayload } from '~/domains/session'
import { EquipmentStep } from './template-start/EquipmentStep'
import { MissingEstimatesPopover } from './TemplateStartValues'
import { ReviewStep } from './template-start/ReviewStep'
import { ScheduleStep } from './template-start/ScheduleStep'
import { StartingNumbersStep } from './template-start/StartingNumbersStep'
import { TemplateStartModals } from './template-start/TemplateStartModals'
import { TemplateStartStepRail } from './template-start/TemplateStartStepRail'
import { WeekOnePreview } from './template-start/WeekOnePreview'
import { useTemplateStartController } from './useTemplateStartController'

/**
 * Programme setup, as four steps.
 *
 * Every step reads and writes the same controller, so the payload sent to `startProgramFn` is the
 * single object it always was — splitting the page changed what is on screen at once, never what
 * gets saved.
 */
export function TemplateStartContent({
  template,
  me,
  today,
  setupOptions,
  liftSeries = null,
  scheduleSelector,
}: {
  template: ProgramTemplateSummary
  me: UserProfile
  today: TodayPayload
  setupOptions: ProgramSetupOptions
  liftSeries?: LiftE1rmSeries[] | null
  /** Optional programme-family variant selector, rendered in the Schedule step. */
  scheduleSelector?: ReactNode
}) {
  const start = useTemplateStartController({ template, me, today, setupOptions, liftSeries })
  const stepProps = { start, template, me, setupOptions, scheduleSelector }
  const blocker = blockerForStep(start.blockers, start.step)
  const forwardLabel = continueToLabel(start.step)
  const isReview = start.step === 'review'

  return (
    <Page className="max-w-[1200px] pb-44 md:px-8 lg:px-10 lg:pb-8">
      <PageHeader
        eyebrow="Set up programme"
        title={template.name}
        actions={
          <>
            <Button variant="default" onClick={() => start.setShowProgrammeInfo(true)}>
              <Info size={14} />
              How it works
            </Button>
            <Badge color={template.origin === 'licensed_partner' ? 'warning' : 'action'}>{template.sourceLabel}</Badge>
            <Badge color="neutral">{template.daysPerWeek} days/wk</Badge>
          </>
        }
      >
        {template.description}
      </PageHeader>

      <TemplateStartStepRail step={start.step} onSelect={start.setStep} />

      {start.step === 'numbers' ? (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
          <StartingNumbersStep
            rows={start.liftRows}
            units={start.units}
            rounding={start.rounding}
            trainingMaxPercent={start.trainingMaxPercent}
            hasTrainingMaxState={start.hasTrainingMaxState}
            onValueChange={start.updateStateValue}
            onTrainingMaxPercentChange={(percent) => start.updateDerivedStatePercent('training_max', percent)}
            onRoundingChange={start.updateRounding}
            onUnitsChange={start.updateUnits}
          />
          <WeekOnePreview week={setupOptions.previewWeeks[0]} showAccessoryNote />
        </div>
      ) : null}
      {start.step === 'equipment' ? <EquipmentStep {...stepProps} /> : null}
      {start.step === 'schedule' ? <ScheduleStep {...stepProps} /> : null}
      {isReview ? <ReviewStep {...stepProps} /> : null}

      {blocker ? (
        <Panel
          p="sm"
          mt="md"
          style={{ borderColor: 'var(--vf-warning-border)', backgroundColor: 'var(--vf-warning-soft)' }}
        >
          <Caption component="p" lh={1.5}>{blocker.message}</Caption>
        </Panel>
      ) : null}

      <div className="mt-4 hidden items-center justify-between gap-3 lg:flex">
        <Button
          variant="default"
          disabled={setupStepPosition(start.step) === 1}
          onClick={() => start.goToStep('previous')}
        >
          <ArrowLeft size={15} />
          Back
        </Button>
        {forwardLabel ? (
          <Button disabled={Boolean(blocker)} onClick={() => start.goToStep('next')}>
            {forwardLabel}
            <ArrowRight size={15} />
          </Button>
        ) : null}
      </div>

      <MobileActionBar maxWidth="1200px">
        {start.startError ? (
          <Text
            size="xs"
            style={{
              border: '1px solid var(--vf-danger-border)',
              backgroundColor: 'var(--vf-danger-soft)',
              color: 'var(--vf-danger-text)',
              borderRadius: 'var(--mantine-radius-md)',
              padding: 'var(--mantine-spacing-xs) var(--mantine-spacing-sm)',
            }}
          >
            {start.startError}
          </Text>
        ) : null}
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <Text size="xs" fw={800} truncate>{template.name}</Text>
            <Caption truncate>
              Step {setupStepPosition(start.step)} of 4
            </Caption>
          </div>
          <div className="flex shrink-0 gap-2">
            <Button
              variant="default"
              disabled={setupStepPosition(start.step) === 1}
              onClick={() => start.goToStep('previous')}
            >
              Back
            </Button>
            {isReview ? (
              <MissingEstimatesPopover active={start.missingRequiredState.length > 0}>
                <Button
                  disabled={start.isStarting || start.missingRequiredState.length > 0}
                  style={start.missingRequiredState.length > 0 ? { pointerEvents: 'none' } : undefined}
                  onClick={start.missingRequiredState.length > 0 ? undefined : start.requestStartProgram}
                >
                  <Check size={16} />
                  Start
                </Button>
              </MissingEstimatesPopover>
            ) : (
              <Button disabled={Boolean(blocker)} onClick={() => start.goToStep('next')}>
                Continue
              </Button>
            )}
          </div>
        </div>
      </MobileActionBar>

      <TemplateStartModals start={start} template={template} setupOptions={setupOptions} today={today} />
    </Page>
  )
}
