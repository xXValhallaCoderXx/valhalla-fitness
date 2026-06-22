import { useMutation, useSuspenseQuery } from '@tanstack/react-query'
import { Badge, Button, Card, TextInput } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import { AlertTriangle, Check, ChevronLeft, ChevronRight, Lock, Plus, RotateCcw, Search, Trash2 } from 'lucide-react'
import { useEffect, useId, useMemo, useState, type Dispatch, type ReactNode, type SetStateAction } from 'react'
import { shouldConfirmProgramStart } from '~/lib/program-switch'
import { getApiErrorMessage } from '~/lib/api-error'
import { getMovementName } from '~/lib/movements'
import { defaultAnchors } from '~/lib/templates'
import { meQueryOptions, templatesQueryOptions, todayQueryOptions } from '~/lib/query-options'
import { startProgramFn } from '~/server/api'
import type {
  AnchorInput,
  ProgramSetupOptions,
  ProgramSetupSlotOption,
  ProgramStartAccessoryAdditionInput,
  ProgramStartMovementOverrideInput,
  ProgramTemplateSummary,
  Unit,
  UserProfile,
} from '~/types/training'
import { ConfirmDialog, EmptyState, Page, PageHeader } from '~/components/ui'

export const Route = createFileRoute('/templates')({
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(templatesQueryOptions())
    if ((context as any).user) {
      await Promise.all([
        context.queryClient.ensureQueryData(meQueryOptions()),
        context.queryClient.ensureQueryData(todayQueryOptions()),
      ])
    }
  },
  component: TemplatesRoute,
})

function TemplatesRoute() {
  const router = useRouter()
  const { data: templates } = useSuspenseQuery(templatesQueryOptions())
  const { data: me } = useSuspenseQuery(meQueryOptions())

  if (!me) {
    return (
      <Page>
        <EmptyState
          title="Sign in to start a program"
          action={<Button onClick={() => router.navigate({ to: '/auth' })}>Sign in</Button>}
        >
          Templates are visible, but starting a program requires a Supabase account.
        </EmptyState>
      </Page>
    )
  }

  return <AuthedTemplates templates={templates} me={me} />
}

type WizardStep = 'basics' | 'movements' | 'accessories' | 'review'

type AccessoryAdditionDraft = ProgramStartAccessoryAdditionInput & {
  clientId: string
}

function AuthedTemplates({
  templates,
  me,
}: {
  templates: ProgramTemplateSummary[]
  me: UserProfile
}) {
  const router = useRouter()
  const { data: today } = useSuspenseQuery(todayQueryOptions())
  const setupTitleId = useId()
  const [filter, setFilter] = useState('All')
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<ProgramTemplateSummary | null>(null)
  const [showSetup, setShowSetup] = useState(false)
  const units = me.units
  const rounding = me.rounding
  const [anchors, setAnchors] = useState<AnchorInput[]>(defaultAnchors(me.units))
  const [showSwitchConfirm, setShowSwitchConfirm] = useState(false)
  const [startError, setStartError] = useState<string | null>(null)
  const activeSessionId = today.activeSession?.sessionId
  const activeTemplateId = today.activeProgram?.templateId ?? null

  const filtered = useMemo(() => {
    return templates.filter((template) => {
      const matchesFilter =
        filter === 'All' ||
        template.tags.some((tag) => tag.toLowerCase() === filter.toLowerCase()) ||
        template.sourceLabel.toLowerCase().includes(filter.toLowerCase())
      const haystack = `${template.name} ${template.description} ${template.sourceLabel}`.toLowerCase()
      return matchesFilter && haystack.includes(query.toLowerCase())
    })
  }, [filter, query, templates])
  const activeTemplate = activeTemplateId ? filtered.find((template) => template.id === activeTemplateId) ?? null : null
  const availableTemplates = activeTemplateId
    ? filtered.filter((template) => template.id !== activeTemplateId)
    : filtered

  const startMutation = useMutation({
    mutationFn: (input: { replaceActiveProgram?: boolean }) => {
      if (!selected) throw new Error('No template selected')
      return startProgramFn({
        data: {
          templateId: selected.id,
          anchors,
          replaceActiveProgram: input.replaceActiveProgram,
        },
      })
    },
    onMutate: () => {
      setStartError(null)
    },
    onError: (error) => {
      if (error instanceof Error && error.message === 'Active program in progress') {
        setShowSwitchConfirm(true)
        return
      }
      const message = getApiErrorMessage(error, 'Unable to start program')
      setStartError(message)
      notifications.show({ color: 'danger', title: 'Could not start program', message })
    },
    onSuccess: async () => {
      notifications.show({ color: 'success', title: 'Program started', message: 'Your next workout is ready.' })
      setShowSwitchConfirm(false)
      setShowSetup(false)
      setSelected(null)
      await router.invalidate()
      const invalidations = [
        router.options.context.queryClient.invalidateQueries({ queryKey: ['activeProgram'] }),
        router.options.context.queryClient.invalidateQueries({ queryKey: ['today'] }),
      ]
      if (activeSessionId) {
        invalidations.push(
          router.options.context.queryClient.invalidateQueries({ queryKey: ['session', activeSessionId] }),
        )
      }
      await Promise.all(invalidations)
      await router.navigate({ to: '/today' })
    },
  })

  const selectTemplate = (template: ProgramTemplateSummary) => {
    setSelected(template)
    setShowSetup(true)
    setShowSwitchConfirm(false)
    setStartError(null)
  }

  const closeSetup = () => {
    setSelected(null)
    setShowSetup(false)
    setShowSwitchConfirm(false)
    setStartError(null)
  }

  const requestStartProgram = () => {
    setStartError(null)
    if (shouldConfirmProgramStart(today)) {
      setShowSetup(false)
      setShowSwitchConfirm(true)
      return
    }
    startMutation.mutate({})
  }

  const confirmSwitch = () => {
    setStartError(null)
    startMutation.mutate({ replaceActiveProgram: true })
  }

  const cancelSwitch = () => {
    setShowSwitchConfirm(false)
    setShowSetup(Boolean(selected))
  }

  useEffect(() => {
    if (!selected || !showSetup || startMutation.isPending) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      setSelected(null)
      setShowSetup(false)
      setShowSwitchConfirm(false)
      setStartError(null)
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [selected, showSetup, startMutation.isPending])

  return (
    <Page className="max-w-[1180px] md:px-8 lg:px-10">
      <PageHeader
        title="Choose a program"
        actions={
          <span className="vf-chip">
            <span className="font-extrabold text-[var(--mantine-color-text)]">{templates.length}</span> programs available
          </span>
        }
      >
        Select a structured program to start your next training cycle.
      </PageHeader>

      <div className="mb-5 space-y-3 md:mb-6">
        <div className="max-w-4xl">
          <TextInput
            leftSection={<Search size={16} />}
            placeholder="Search programs"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar sm:flex-wrap sm:overflow-visible sm:pb-0">
          {['All', '5/3/1', 'Bromley', 'Base', 'Peak', 'High volume', 'Low volume'].map((item) => (
            <button
              key={item}
              className={`min-h-8 whitespace-nowrap rounded-md border px-3 py-1.5 text-xs font-bold transition ${
                filter === item
                  ? 'border-[var(--mantine-primary-color-filled)] bg-[var(--mantine-primary-color-filled)] text-white'
                  : 'border-[var(--mantine-color-default-border)] bg-[var(--mantine-color-default)] text-[var(--mantine-color-dimmed)] hover:border-[var(--vf-action-border)] hover:text-[var(--mantine-color-text)]'
              }`}
              onClick={() => setFilter(item)}
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      <p className="mb-3 text-[11px] font-semibold text-[var(--mantine-color-dimmed)]">Showing {filtered.length} programs</p>

      <div className="space-y-6">
        {activeTemplate ? (
          <section>
            <p className="vf-section-label mb-3">Active</p>
            <TemplateGrid>
              <TemplateCard template={activeTemplate} isActive onStart={() => selectTemplate(activeTemplate)} />
            </TemplateGrid>
          </section>
        ) : null}

        <section>
          <p className="vf-section-label mb-3">{activeTemplate ? 'Available' : 'Programs'}</p>
          {availableTemplates.length ? (
            <TemplateGrid>
              {availableTemplates.map((template) => (
                <TemplateCard key={template.id} template={template} onStart={() => selectTemplate(template)} />
              ))}
            </TemplateGrid>
          ) : (
            <EmptyState title={activeTemplate ? 'No other matching programs' : 'No matching programs'}>
              Adjust the search or filter to see more templates.
            </EmptyState>
          )}
        </section>
      </div>

      {selected && showSetup ? (
        <div
          className="fixed inset-0 z-50 flex items-end bg-black/60 p-3 sm:items-center sm:justify-center"
          onClick={() => {
            if (!startMutation.isPending) closeSetup()
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={setupTitleId}
            className="w-full max-w-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <ProgramStartWizard
              titleId={setupTitleId}
              template={selected}
              units={units}
              rounding={rounding}
              anchors={anchors}
              isPending={startMutation.isPending}
              startError={startError}
              onClose={closeSetup}
              onAnchorsChange={setAnchors}
              onStart={requestStartProgram}
            />
          </div>
        </div>
      ) : null}
      <ConfirmDialog
        open={showSwitchConfirm}
        title="Replace active program?"
        confirmLabel="Replace program"
        confirmVariant="danger"
        isPending={startMutation.isPending}
        onCancel={cancelSwitch}
        onConfirm={confirmSwitch}
      >
        <div className="space-y-2">
          <p>
            {today.activeProgram ? (
              <>
                You already have{' '}
                <span className="font-semibold text-[var(--mantine-color-text)]">{today.activeProgram.title}</span> active.
              </>
            ) : (
              'You already have an active program.'
            )}
          </p>
          <p>
            Starting <span className="font-semibold text-[var(--mantine-color-text)]">{selected?.name ?? 'a new program'}</span>{' '}
            will archive the current program and make this your new active program.
          </p>
          {today.activeSession ? (
            <p>
              Your workout in progress will be marked as abandoned. Any lifts that have already been saved will be
              retained.
            </p>
          ) : null}
        </div>
      </ConfirmDialog>
    </Page>
  )
}

function ProgramStartWizard({
  titleId,
  template,
  units,
  rounding,
  anchors,
  isPending,
  startError,
  onClose,
  onAnchorsChange,
  onStart,
}: {
  titleId: string
  template: ProgramTemplateSummary
  units: Unit
  rounding: number
  anchors: AnchorInput[]
  isPending: boolean
  startError: string | null
  onClose: () => void
  onAnchorsChange: Dispatch<SetStateAction<AnchorInput[]>>
  onStart: () => void
}) {
  return (
    <Card className="max-h-[92vh] overflow-hidden p-0">
      <div className="border-b border-[var(--mantine-color-default-border)] p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 id={titleId} className="truncate text-lg font-bold">
                {template.name}
              </h2>
              <Badge color={template.origin === 'coach_authored' ? 'warning' : 'action'}>{template.sourceLabel}</Badge>
            </div>
            <p className="mt-1 text-sm text-[var(--mantine-color-dimmed)]">{template.description}</p>
          </div>
          <Button color="neutral" variant="subtle" onClick={onClose}>
            Close
          </Button>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          <StartInfoMetric label="Schedule" value={`${template.daysPerWeek} days/wk`} />
          <StartInfoMetric label="Progression" value={template.progressionLabel} />
          <StartInfoMetric label="Complexity" value={template.complexity} />
        </div>
      </div>

      <div className="max-h-[58vh] overflow-y-auto p-4">
        <BasicsStep
          units={units}
          rounding={rounding}
          anchors={anchors}
          onAnchorsChange={onAnchorsChange}
        />
      </div>

      <div className="border-t border-[var(--mantine-color-default-border)] p-4">
        {startError ? (
          <p className="mb-3 rounded-lg border border-[var(--vf-danger-border)] bg-[var(--vf-danger-soft)] p-3 text-sm text-[var(--vf-danger-text)]">
            {startError}
          </p>
        ) : null}
        <Button className="w-full" disabled={isPending} onClick={onStart}>
          <Check size={16} />
          Start program
        </Button>
      </div>
    </Card>
  )
}

function StartInfoMetric({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-lg border border-[var(--mantine-color-default-border)] bg-[var(--vf-surface-2)] p-3">
      <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--mantine-color-dimmed)]">{label}</p>
      <p className="mt-1 text-sm font-extrabold">{value}</p>
    </div>
  )
}

export function ProgramCustomizationDraftWizard({
  titleId,
  template,
  setupOptions,
  isSetupLoading,
  setupError,
  units,
  rounding,
  anchors,
  wizardStep,
  currentStepIndex,
  movementOverrides,
  accessoryAdditions,
  movementOverrideCount,
  accessoryAdditionCount,
  hasCustomizations,
  showCustomizationWarning,
  isPending,
  startError,
  onClose,
  onAnchorsChange,
  onStepChange,
  onMovementOverrideChange,
  onAddAccessory,
  onRemoveAccessory,
  onBack,
  onNext,
  onStart,
}: {
  titleId: string
  template: ProgramTemplateSummary
  setupOptions: ProgramSetupOptions | null
  isSetupLoading: boolean
  setupError: string | null
  units: Unit
  rounding: number
  anchors: AnchorInput[]
  wizardStep: WizardStep
  currentStepIndex: number
  movementOverrides: ProgramStartMovementOverrideInput[]
  accessoryAdditions: AccessoryAdditionDraft[]
  movementOverrideCount: number
  accessoryAdditionCount: number
  hasCustomizations: boolean
  showCustomizationWarning: boolean
  isPending: boolean
  startError: string | null
  onClose: () => void
  onAnchorsChange: Dispatch<SetStateAction<AnchorInput[]>>
  onStepChange: (step: WizardStep) => void
  onMovementOverrideChange: (slot: ProgramSetupSlotOption, replacementMovementId: string) => void
  onAddAccessory: (addition: ProgramStartAccessoryAdditionInput) => void
  onRemoveAccessory: (clientId: string) => void
  onBack: () => void
  onNext: () => void
  onStart: () => void
}) {
  const steps: Array<{ id: WizardStep; label: string }> = [
    { id: 'basics', label: 'Basics' },
    { id: 'movements', label: 'Movements' },
    { id: 'accessories', label: 'Accessories' },
    { id: 'review', label: 'Review' },
  ]
  const isReview = wizardStep === 'review'
  const canMoveForward = wizardStep === 'basics' || Boolean(setupOptions)

  return (
    <Card className="max-h-[92vh] overflow-hidden p-0">
      <div className="border-b border-[var(--mantine-color-default-border)] p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 id={titleId} className="truncate text-lg font-bold">
                {template.name}
              </h2>
              {hasCustomizations ? <Badge color="warning">Customized</Badge> : null}
            </div>
            <p className="mt-1 text-sm text-[var(--mantine-color-dimmed)]">
              Set anchors, choose variations, and review accessory changes before starting.
            </p>
          </div>
          <Button color="neutral" variant="subtle" onClick={onClose}>
            Close
          </Button>
        </div>

        <div className="mt-4 grid grid-cols-4 gap-2">
          {steps.map((step, index) => (
            <button
              key={step.id}
              className={`min-h-9 rounded-md border px-2 text-xs font-bold transition ${
                wizardStep === step.id
                  ? 'border-[var(--mantine-primary-color-filled)] bg-[var(--mantine-primary-color-filled)] text-white'
                  : 'border-[var(--mantine-color-default-border)] bg-[var(--vf-surface-2)] text-[var(--mantine-color-dimmed)]'
              }`}
              onClick={() => onStepChange(step.id)}
              disabled={isPending || (index > 0 && !setupOptions && step.id !== 'basics')}
            >
              {step.label}
            </button>
          ))}
        </div>

        {showCustomizationWarning ? (
          <div className="mt-3 flex items-start gap-2 rounded-lg border border-[var(--vf-warning-border)] bg-[var(--vf-warning-soft)] p-3 text-sm text-[var(--vf-warning-text)]">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
            <p>
              This programme will be customized from the default coach template. The original template stays unchanged.
            </p>
          </div>
        ) : null}
      </div>

      <div className="max-h-[58vh] overflow-y-auto p-4">
        {wizardStep === 'basics' ? (
          <BasicsStep
            units={units}
            rounding={rounding}
            anchors={anchors}
            onAnchorsChange={onAnchorsChange}
          />
        ) : isSetupLoading ? (
          <p className="rounded-lg border border-[var(--mantine-color-default-border)] bg-[var(--vf-surface-2)] p-4 text-sm text-[var(--mantine-color-dimmed)]">
            Loading programme setup options.
          </p>
        ) : setupError ? (
          <p className="rounded-lg border border-[var(--vf-danger-border)] bg-[var(--vf-danger-soft)] p-4 text-sm text-[var(--vf-danger-text)]">
            {setupError}
          </p>
        ) : setupOptions && wizardStep === 'movements' ? (
          <MovementsStep
            setupOptions={setupOptions}
            movementOverrides={movementOverrides}
            onMovementOverrideChange={onMovementOverrideChange}
          />
        ) : setupOptions && wizardStep === 'accessories' ? (
          <AccessoriesStep
            setupOptions={setupOptions}
            accessoryAdditions={accessoryAdditions}
            onAddAccessory={onAddAccessory}
            onRemoveAccessory={onRemoveAccessory}
          />
        ) : setupOptions && wizardStep === 'review' ? (
          <ReviewStep
            setupOptions={setupOptions}
            units={units}
            rounding={rounding}
            anchors={anchors}
            movementOverrides={movementOverrides}
            accessoryAdditions={accessoryAdditions}
            movementOverrideCount={movementOverrideCount}
            accessoryAdditionCount={accessoryAdditionCount}
          />
        ) : null}
      </div>

      <div className="border-t border-[var(--mantine-color-default-border)] p-4">
        {startError ? (
          <p className="mb-3 rounded-lg border border-[var(--vf-danger-border)] bg-[var(--vf-danger-soft)] p-3 text-sm text-[var(--vf-danger-text)]">
            {startError}
          </p>
        ) : null}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
          <Button variant="default" disabled={isPending || currentStepIndex === 0} onClick={onBack}>
            <ChevronLeft size={14} />
            Back
          </Button>
          <div className="flex gap-2 sm:justify-end">
            {!isReview ? (
              <Button className="flex-1 sm:flex-none" disabled={isPending || !canMoveForward} onClick={onNext}>
                Next
                <ChevronRight size={14} />
              </Button>
            ) : (
              <Button className="flex-1 sm:flex-none" disabled={isPending} onClick={onStart}>
                <Check size={16} />
                Start program
              </Button>
            )}
          </div>
        </div>
      </div>
    </Card>
  )
}

function BasicsStep({
  units,
  rounding,
  anchors,
  onAnchorsChange,
}: {
  units: Unit
  rounding: number
  anchors: AnchorInput[]
  onAnchorsChange: Dispatch<SetStateAction<AnchorInput[]>>
}) {
  return (
    <div className="grid gap-4">
      <div className="rounded-lg border border-[var(--mantine-color-default-border)] bg-[var(--vf-surface-2)] p-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="vf-section-label">Programme defaults</p>
            <p className="mt-1 text-xs text-[var(--mantine-color-dimmed)]">
              New programmes use your saved preferences.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs font-bold text-[var(--mantine-color-text)]">
            <span className="rounded-md border border-[var(--mantine-color-default-border)] bg-[var(--mantine-color-default)] px-2 py-1">
              {units}
            </span>
            <span className="rounded-md border border-[var(--mantine-color-default-border)] bg-[var(--mantine-color-default)] px-2 py-1">
              Round {rounding}
            </span>
          </div>
        </div>
        <a
          href="/settings#preferences"
          className="mt-2 inline-flex text-xs font-bold text-[var(--mantine-primary-color-filled)] hover:underline"
        >
          Edit in Settings
        </a>
      </div>
      <div className="grid gap-2">
        <div>
          <p className="vf-section-label">Starting anchors</p>
          <p className="mt-1 text-xs text-[var(--mantine-color-dimmed)]">
            Enter the training max used to calculate the first block of prescribed loads.
          </p>
        </div>
        {anchors.map((anchor) => (
          <label
            key={anchor.movementId}
            className="grid gap-3 rounded-lg border border-[var(--mantine-color-default-border)] bg-[var(--vf-surface-2)] p-3 sm:grid-cols-[minmax(0,1fr)_11rem] sm:items-center"
          >
            <span className="min-w-0">
              <span className="block text-sm font-extrabold text-[var(--mantine-color-text)]">{getMovementName(anchor.movementId)}</span>
              <span className="mt-0.5 block text-[10px] font-semibold uppercase tracking-wide text-[var(--mantine-color-dimmed)]">
                {anchor.anchorType.replaceAll('_', ' ')}
              </span>
            </span>
            <span className="relative block">
              <TextInput
                classNames={{ input: 'pr-12 text-right' }}
                type="number"
                value={anchor.value}
                onChange={(event) =>
                  onAnchorsChange((current) =>
                    current.map((item) =>
                      item.movementId === anchor.movementId ? { ...item, value: Number(event.target.value) } : item,
                    ),
                  )
                }
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[var(--mantine-color-dimmed)]">
                {units}
              </span>
            </span>
          </label>
        ))}
      </div>
    </div>
  )
}

function MovementsStep({
  setupOptions,
  movementOverrides,
  onMovementOverrideChange,
}: {
  setupOptions: ProgramSetupOptions
  movementOverrides: ProgramStartMovementOverrideInput[]
  onMovementOverrideChange: (slot: ProgramSetupSlotOption, replacementMovementId: string) => void
}) {
  return (
    <div className="grid gap-4">
      <div>
        <p className="vf-section-label">Variations and accessories</p>
        <p className="mt-1 text-xs text-[var(--mantine-color-dimmed)]">
          Main lifts stay locked. Programme-level replacements apply from week 1.
        </p>
      </div>
      {setupOptions.sessions.map((session) => (
        <div key={session.id} className="rounded-lg border border-[var(--mantine-color-default-border)] bg-[var(--vf-surface-2)] p-3">
          <p className="text-sm font-extrabold">{session.title}</p>
          <div className="mt-3 grid gap-2">
            {session.slots.length ? session.slots.map((slot) => {
              const selected = movementOverrides.find(
                (override) => override.slotId === slot.slotId && override.phaseKey === slot.phaseKey && override.role === slot.role,
              )
              const value = selected?.replacementMovementId ?? slot.defaultMovementId
              return (
                <div
                  key={`${slot.slotId}-${slot.phaseKey}`}
                  className="grid gap-2 rounded-md border border-[var(--mantine-color-default-border)] bg-[var(--mantine-color-default)] p-3 md:grid-cols-[minmax(0,1fr)_minmax(12rem,18rem)_auto] md:items-center"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge color={slot.role === 'variation' ? 'action' : 'neutral'} size="xs">{slot.role}</Badge>
                      <span className="text-[10px] font-bold uppercase tracking-wide text-[var(--mantine-color-dimmed)]">{slot.phaseLabel}</span>
                    </div>
                    <p className="mt-1 truncate text-sm font-bold">{slot.defaultMovementName}</p>
                    <p className="truncate text-[10px] text-[var(--mantine-color-dimmed)]">{slot.targetSummary}</p>
                  </div>
                  <select
                    className="min-h-10 rounded-md border border-[var(--mantine-color-default-border)] bg-[var(--vf-surface-2)] px-3 text-sm"
                    value={value}
                    onChange={(event) => onMovementOverrideChange(slot, event.target.value)}
                  >
                    <option value={slot.defaultMovementId}>Use default</option>
                    {slot.replacementOptions.map((option) => (
                      <option key={option.movementId} value={option.movementId}>
                        {option.movementName}
                      </option>
                    ))}
                  </select>
                  <Button
                    variant="default"
                    disabled={value === slot.defaultMovementId}
                    onClick={() => onMovementOverrideChange(slot, slot.defaultMovementId)}
                  >
                    <RotateCcw size={14} />
                    Reset
                  </Button>
                </div>
              )
            }) : (
              <p className="text-sm text-[var(--mantine-color-dimmed)]">No configurable variation or accessory slots.</p>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

function AccessoriesStep({
  setupOptions,
  accessoryAdditions,
  onAddAccessory,
  onRemoveAccessory,
}: {
  setupOptions: ProgramSetupOptions
  accessoryAdditions: AccessoryAdditionDraft[]
  onAddAccessory: (addition: ProgramStartAccessoryAdditionInput) => void
  onRemoveAccessory: (clientId: string) => void
}) {
  const firstSession = setupOptions.sessions.find((session) => session.accessoryPrescriptions.length)
  const [sessionId, setSessionId] = useState(firstSession?.id ?? setupOptions.sessions[0]?.id ?? '')
  const selectedSession = setupOptions.sessions.find((session) => session.id === sessionId) ?? firstSession
  const [sourceSlotId, setSourceSlotId] = useState(selectedSession?.accessoryPrescriptions[0]?.sourceSlotId ?? '')
  const [movementId, setMovementId] = useState(setupOptions.accessoryCatalog[0]?.movementId ?? '')
  const effectiveSourceSlotId = selectedSession?.accessoryPrescriptions.some((item) => item.sourceSlotId === sourceSlotId)
    ? sourceSlotId
    : selectedSession?.accessoryPrescriptions[0]?.sourceSlotId ?? ''

  const canAdd = Boolean(selectedSession && effectiveSourceSlotId && movementId)
  return (
    <div className="grid gap-4">
      <div>
        <p className="vf-section-label">Add accessory slots</p>
        <p className="mt-1 text-xs text-[var(--mantine-color-dimmed)]">
          Extra accessories copy an existing accessory prescription from the selected session.
        </p>
      </div>
      <div className="grid gap-3 rounded-lg border border-[var(--mantine-color-default-border)] bg-[var(--vf-surface-2)] p-3 md:grid-cols-[1fr_1fr_1fr_auto] md:items-end">
        <label className="grid gap-1">
          <span className="text-xs font-bold uppercase text-[var(--mantine-color-dimmed)]">Session</span>
          <select
            className="min-h-10 rounded-md border border-[var(--mantine-color-default-border)] bg-[var(--mantine-color-default)] px-3 text-sm"
            value={sessionId}
            onChange={(event) => setSessionId(event.target.value)}
          >
            {setupOptions.sessions.filter((session) => session.accessoryPrescriptions.length).map((session) => (
              <option key={session.id} value={session.id}>{session.title}</option>
            ))}
          </select>
        </label>
        <label className="grid gap-1">
          <span className="text-xs font-bold uppercase text-[var(--mantine-color-dimmed)]">Prescription</span>
          <select
            className="min-h-10 rounded-md border border-[var(--mantine-color-default-border)] bg-[var(--mantine-color-default)] px-3 text-sm"
            value={effectiveSourceSlotId}
            onChange={(event) => setSourceSlotId(event.target.value)}
          >
            {selectedSession?.accessoryPrescriptions.map((option) => (
              <option key={option.sourceSlotId} value={option.sourceSlotId}>{option.label}</option>
            ))}
          </select>
        </label>
        <label className="grid gap-1">
          <span className="text-xs font-bold uppercase text-[var(--mantine-color-dimmed)]">Movement</span>
          <select
            className="min-h-10 rounded-md border border-[var(--mantine-color-default-border)] bg-[var(--mantine-color-default)] px-3 text-sm"
            value={movementId}
            onChange={(event) => setMovementId(event.target.value)}
          >
            {setupOptions.accessoryCatalog.map((movement) => (
              <option key={movement.movementId} value={movement.movementId}>{movement.movementName}</option>
            ))}
          </select>
        </label>
        <Button disabled={!canAdd} onClick={() => onAddAccessory({ sessionId, sourceSlotId: effectiveSourceSlotId, movementId })}>
          <Plus size={14} />
          Add
        </Button>
      </div>

      <div className="grid gap-2">
        <p className="vf-section-label">Extra accessories</p>
        {accessoryAdditions.length ? accessoryAdditions.map((addition) => {
          const session = setupOptions.sessions.find((item) => item.id === addition.sessionId)
          const source = session?.accessoryPrescriptions.find((item) => item.sourceSlotId === addition.sourceSlotId)
          return (
            <div
              key={addition.clientId}
              className="grid gap-2 rounded-lg border border-[var(--mantine-color-default-border)] bg-[var(--vf-surface-2)] p-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-bold">{getMovementName(addition.movementId)}</p>
                <p className="truncate text-xs text-[var(--mantine-color-dimmed)]">
                  {session?.title ?? addition.sessionId} · {source?.targetSummary ?? 'Accessory work'}
                </p>
              </div>
              <Button color="danger" variant="light" onClick={() => onRemoveAccessory(addition.clientId)}>
                <Trash2 size={14} />
                Remove
              </Button>
            </div>
          )
        }) : (
          <p className="rounded-lg border border-[var(--mantine-color-default-border)] bg-[var(--vf-surface-2)] p-3 text-sm text-[var(--mantine-color-dimmed)]">
            No extra accessories added.
          </p>
        )}
      </div>
    </div>
  )
}

function ReviewStep({
  setupOptions,
  units,
  rounding,
  anchors,
  movementOverrides,
  accessoryAdditions,
  movementOverrideCount,
  accessoryAdditionCount,
}: {
  setupOptions: ProgramSetupOptions
  units: Unit
  rounding: number
  anchors: AnchorInput[]
  movementOverrides: ProgramStartMovementOverrideInput[]
  accessoryAdditions: AccessoryAdditionDraft[]
  movementOverrideCount: number
  accessoryAdditionCount: number
}) {
  const setupSlots = setupOptions.sessions.flatMap((session) => session.slots)
  return (
    <div className="grid gap-4">
      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-lg border border-[var(--mantine-color-default-border)] bg-[var(--vf-surface-2)] p-3">
          <p className="text-xs font-bold uppercase text-[var(--mantine-color-dimmed)]">Units</p>
          <p className="mt-1 text-lg font-black">{units}</p>
        </div>
        <div className="rounded-lg border border-[var(--mantine-color-default-border)] bg-[var(--vf-surface-2)] p-3">
          <p className="text-xs font-bold uppercase text-[var(--mantine-color-dimmed)]">Rounding</p>
          <p className="mt-1 text-lg font-black">{rounding}</p>
        </div>
        <div className="rounded-lg border border-[var(--mantine-color-default-border)] bg-[var(--vf-surface-2)] p-3">
          <p className="text-xs font-bold uppercase text-[var(--mantine-color-dimmed)]">Customizations</p>
          <p className="mt-1 text-lg font-black">{movementOverrideCount + accessoryAdditionCount}</p>
        </div>
      </div>

      <div className="rounded-lg border border-[var(--mantine-color-default-border)] bg-[var(--vf-surface-2)] p-3">
        <p className="vf-section-label">Anchors</p>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {anchors.map((anchor) => (
            <div key={anchor.movementId} className="rounded-md bg-[var(--mantine-color-default)] px-3 py-2">
              <p className="text-xs text-[var(--mantine-color-dimmed)]">{getMovementName(anchor.movementId)}</p>
              <p className="text-sm font-bold">{anchor.value} {units}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-[var(--mantine-color-default-border)] bg-[var(--vf-surface-2)] p-3">
        <p className="vf-section-label">Movement changes</p>
        <div className="mt-2 space-y-2">
          {movementOverrides.length ? movementOverrides.map((override) => {
            const slot = setupSlots.find(
              (item) => item.slotId === override.slotId && item.phaseKey === override.phaseKey && item.role === override.role,
            )
            return (
              <div key={`${override.slotId}-${override.phaseKey}`} className="rounded-md bg-[var(--mantine-color-default)] px-3 py-2 text-sm">
                <span className="font-bold">{slot?.sessionTitle ?? 'Session'}</span>
                <span className="text-[var(--mantine-color-dimmed)]"> · {slot?.phaseLabel ?? override.phaseKey}</span>
                <p className="mt-1 text-xs">
                  {getMovementName(override.originalMovementId)} to <span className="font-bold">{getMovementName(override.replacementMovementId)}</span>
                </p>
              </div>
            )
          }) : (
            <p className="text-sm text-[var(--mantine-color-dimmed)]">No movement replacements.</p>
          )}
        </div>
      </div>

      <div className="rounded-lg border border-[var(--mantine-color-default-border)] bg-[var(--vf-surface-2)] p-3">
        <p className="vf-section-label">Added accessories</p>
        <div className="mt-2 space-y-2">
          {accessoryAdditions.length ? accessoryAdditions.map((addition) => {
            const session = setupOptions.sessions.find((item) => item.id === addition.sessionId)
            return (
              <div key={addition.clientId} className="rounded-md bg-[var(--mantine-color-default)] px-3 py-2 text-sm">
                <span className="font-bold">{getMovementName(addition.movementId)}</span>
                <span className="text-[var(--mantine-color-dimmed)]"> · {session?.title ?? addition.sessionId}</span>
              </div>
            )
          }) : (
            <p className="text-sm text-[var(--mantine-color-dimmed)]">No extra accessories.</p>
          )}
        </div>
      </div>
    </div>
  )
}

function TemplateCard({
  template,
  isActive = false,
  onStart,
}: {
  template: ProgramTemplateSummary
  isActive?: boolean
  onStart: () => void
}) {
  return (
    <Card className={`group flex min-h-[16rem] flex-col gap-4 p-4 vf-card-hover ${isActive ? 'border-[var(--vf-success-border)] bg-[var(--vf-success-soft)]' : ''}`}>
      <div className="flex flex-1 flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge color={template.sourceLabel === 'Bromley' ? 'warning' : 'action'}>{template.sourceLabel}</Badge>
          {isActive ? <Badge color="success">Active</Badge> : null}
          <span className="text-[11px] font-semibold text-[var(--mantine-color-dimmed)]">{template.daysPerWeek} days/wk</span>
          <Badge color="action" className="normal-case sm:ml-auto">
            {template.progressionLabel}
          </Badge>
        </div>

        <div>
          <h2 className="text-lg font-extrabold leading-tight tracking-tight md:text-xl">{template.name}</h2>
          <p className="mt-2 text-sm leading-relaxed text-[var(--mantine-color-dimmed)]">{template.description}</p>
        </div>

        <div className="mt-auto flex flex-wrap gap-1.5 text-[10px] text-[var(--mantine-color-dimmed)]">
          <span className="rounded-md bg-[var(--vf-surface-2)] px-1.5 py-0.5 font-semibold">{template.complexity}</span>
          {template.tags.slice(0, 3).map((tag) => (
            <span key={tag} className="rounded-md bg-[var(--vf-surface-2)] px-1.5 py-0.5 font-semibold">
              {tag}
            </span>
          ))}
        </div>
      </div>
      {isActive ? (
        <Button color="success" variant="light" disabled>
          <Check size={16} />
          Active Program
        </Button>
      ) : template.available ? (
        <Button className="w-full" onClick={onStart}>
          <Check size={16} />
          Start Program
        </Button>
      ) : (
        <Button variant="default" disabled>
          <Lock size={16} />
          Not yet
        </Button>
      )}
    </Card>
  )
}

function TemplateGrid({ children }: { children: ReactNode }) {
  return (
    <div
      className="grid items-stretch gap-4 md:gap-5"
      style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 22rem), 1fr))' }}
    >
      {children}
    </div>
  )
}
