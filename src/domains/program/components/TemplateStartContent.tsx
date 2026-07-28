import { Badge, Button } from '@mantine/core'
import { Link } from '@tanstack/react-router'
import { ArrowLeft, Check, Info } from 'lucide-react'
import type { ReactNode } from 'react'
import { Caption, ConfirmDialog, Page, PageHeader, Text } from '~/components'
import { defaultsSummary } from '~/domains/program/lib/template-start-utils'
import type { UserProfile } from '~/domains/account'
import type { ProgramSetupOptions, ProgramTemplateSummary } from '~/domains/program'
import type { TodayPayload } from '~/domains/session'
import { StartInfoMetric } from './TemplateStartMetric'
import { ProgrammeBlocksCard } from './TemplateStartBlocks'
import { ProgrammeInfoModal } from './TemplateStartInfoModal'
import { TemplateStartPreview } from './TemplateStartPreview'
import { DefaultsModal, MissingEstimatesPopover, QuickFactsCard, SetupValuesButton, StartSummaryPanel } from './TemplateStartValues'
import { useTemplateStartController } from './useTemplateStartController'

export function TemplateStartContent({
  template,
  me,
  today,
  setupOptions,
  scheduleSelector,
}: {
  template: ProgramTemplateSummary
  me: UserProfile
  today: TodayPayload
  setupOptions: ProgramSetupOptions
  /** Optional programme-family variant selector rendered under the header (see TemplateStartPage). */
  scheduleSelector?: ReactNode
}) {
  const start = useTemplateStartController({ template, me, today, setupOptions })
  const {
    activeWeek,
    activeWeekOption,
    weekOptions,
    phases,
    mode,
    activePhaseKey,
    changedSlots,
    quickFacts,
    visibleState,
    missingRequiredState,
    hasTrainingMaxState,
    hasWorkingLoadState,
    customizationCount,
    movementOverrides,
    accessoryAdditions,
    trainingMaxPercent,
    workingLoadPercent,
    startError,
    isStarting,
    showSwitchConfirm,
    showDefaultsModal,
    showProgrammeInfo,
    setActiveWeekIndex,
    setShowSwitchConfirm,
    setShowDefaultsModal,
    setShowProgrammeInfo,
    updateStateValue,
    updateDerivedStatePercent,
    handleMovementOverrideChange,
    handleAddAccessory,
    handleRemoveAccessory,
    requestStartProgram,
    confirmSwitch,
  } = start

  return (
    <Page className="max-w-[1200px] pb-44 md:px-8 lg:px-10 lg:pb-8">
      <Link
        to="/templates"
        className="mb-3 inline-flex items-center gap-1.5 transition"
        style={{
          color: 'var(--mantine-color-dimmed)',
          fontSize: 'var(--mantine-font-size-xs)',
          fontWeight: 700,
        }}
      >
        <ArrowLeft size={14} />
        Templates
      </Link>

      <PageHeader
        eyebrow="Start programme"
        title={template.name}
        actions={
          <>
            <Button variant="default" onClick={() => setShowProgrammeInfo(true)}>
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

      {scheduleSelector}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-start">
        <div className="min-w-0 space-y-4">
          <ProgrammeBlocksCard
            mode={mode}
            phases={phases}
            activePhaseKey={activePhaseKey}
            weeks={setupOptions.previewWeeks}
            onSelectPhase={setActiveWeekIndex}
          />

          <div className="grid gap-2 sm:grid-cols-3 lg:hidden">
            <StartInfoMetric label="Schedule" value={`${template.daysPerWeek} days/wk`} />
            <StartInfoMetric label="Progression" value={template.progressionLabel} />
            <StartInfoMetric label="Complexity" value={template.complexity} />
          </div>

          <TemplateStartPreview
            activeWeek={activeWeek}
            activeWeekOption={activeWeekOption}
            weekOptions={weekOptions}
            mode={mode}
            phases={phases}
            activePhaseKey={activePhaseKey}
            changedSlots={changedSlots}
            units={me.units}
            setupOptions={setupOptions}
            movementOverrides={movementOverrides}
            accessoryAdditions={accessoryAdditions}
            onWeekChange={setActiveWeekIndex}
            onMovementOverrideChange={handleMovementOverrideChange}
            onAddAccessory={handleAddAccessory}
            onRemoveAccessory={handleRemoveAccessory}
          />
        </div>

        <div className="hidden lg:sticky lg:top-0 lg:flex lg:flex-col lg:gap-4">
          <QuickFactsCard facts={quickFacts} />
          <StartSummaryPanel
            units={me.units}
            rounding={me.rounding}
            visibleState={visibleState}
            missingRequiredState={missingRequiredState}
            hasTrainingMaxState={hasTrainingMaxState}
            hasWorkingLoadState={hasWorkingLoadState}
            customizationCount={customizationCount}
            startError={startError}
            isPending={isStarting}
            onStart={requestStartProgram}
            onViewDefaults={() => setShowDefaultsModal(true)}
          />
        </div>
      </div>

      <div
        className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-30 border-t p-3 backdrop-blur lg:hidden"
        style={{
          borderColor: 'var(--mantine-color-default-border)',
          backgroundColor: 'color-mix(in srgb, var(--mantine-color-default) 96%, transparent)',
          boxShadow: '0 -12px 36px rgb(0 0 0 / 0.12)',
        }}
      >
        <div className="mx-auto flex max-w-[1200px] flex-col gap-2">
          {startError ? (
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
              {startError}
            </Text>
          ) : null}
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <Text size="xs" fw={800} truncate>{template.name}</Text>
              <Caption truncate>
                {defaultsSummary(me.units, me.rounding, visibleState)}
              </Caption>
            </div>
            <div className="flex shrink-0 gap-2">
              <SetupValuesButton
                disabled={missingRequiredState.length > 0}
                label={missingRequiredState.length === 0 && visibleState.length > 0 ? 'Modify values' : 'Values'}
                onClick={() => setShowDefaultsModal(true)}
              />
              <MissingEstimatesPopover active={missingRequiredState.length > 0}>
                <Button
                  disabled={isStarting || missingRequiredState.length > 0}
                  style={missingRequiredState.length > 0 ? { pointerEvents: 'none' } : undefined}
                  onClick={missingRequiredState.length > 0 ? undefined : requestStartProgram}
                >
                  <Check size={16} />
                  Start
                </Button>
              </MissingEstimatesPopover>
            </div>
          </div>
        </div>
      </div>

      <DefaultsModal
        opened={showDefaultsModal}
        units={me.units}
        rounding={me.rounding}
        profileDefaults={me.programStateDefaults}
        visibleState={visibleState}
        missingRequiredState={missingRequiredState}
        trainingMaxPercent={trainingMaxPercent}
        workingLoadPercent={workingLoadPercent}
        hasTrainingMaxState={hasTrainingMaxState}
        hasWorkingLoadState={hasWorkingLoadState}
        onTrainingMaxPercentChange={(percent) => updateDerivedStatePercent('training_max', percent)}
        onWorkingLoadPercentChange={(percent) => updateDerivedStatePercent('working_load', percent)}
        onStateValueChange={updateStateValue}
        onClose={() => setShowDefaultsModal(false)}
      />
      <ProgrammeInfoModal
        opened={showProgrammeInfo}
        template={template}
        setupOptions={setupOptions}
        phases={phases}
        weekOptions={weekOptions}
        onClose={() => setShowProgrammeInfo(false)}
      />

      <ConfirmDialog
        open={showSwitchConfirm}
        title="Replace active programme?"
        confirmLabel="Replace programme"
        confirmVariant="danger"
        tone="danger"
        isPending={isStarting}
        onCancel={() => setShowSwitchConfirm(false)}
        onConfirm={confirmSwitch}
      >
        <div className="space-y-2">
          <Text>
            You already have{' '}
            <Text component="span" fw={600}>
              {today.activeProgram?.title ?? 'an active programme'}
            </Text>{' '}
            active.
          </Text>
          <Text>
            Starting <Text component="span" fw={600}>{template.name}</Text> will archive the current programme and make
            this your new active programme.
          </Text>
          {today.activeSession ? (
            <Text>Your workout in progress will be marked as abandoned. Saved lifts will be retained.</Text>
          ) : null}
        </div>
      </ConfirmDialog>
    </Page>
  )
}
