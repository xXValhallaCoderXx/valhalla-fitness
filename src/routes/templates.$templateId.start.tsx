import { useMutation, useQuery } from '@tanstack/react-query'
import { Badge, Button, Card, Modal, Popover, Slider, TextInput } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { createFileRoute, Link, useRouter } from '@tanstack/react-router'
import { ArrowLeft, Check, Info, Lock, Plus, RotateCcw, Settings, Trash2 } from 'lucide-react'
import { useMemo, useState, type ReactNode } from 'react'
import { getApiErrorMessage } from '~/lib/api-error'
import { getMovementName } from '~/lib/movements'
import {
  DEFAULT_TRAINING_MAX_PERCENT,
  DEFAULT_WORKING_LOAD_PERCENT,
  MAX_TRAINING_MAX_PERCENT,
  MAX_WORKING_LOAD_PERCENT,
  MIN_TRAINING_MAX_PERCENT,
  MIN_WORKING_LOAD_PERCENT,
  buildProgramStartStateValues,
  oneRepMaxKeyForMovement,
  profileLoadDefault,
  suggestedLoadFromOneRepMax,
} from '~/lib/program-loads'
import { shouldConfirmProgramStart } from '~/lib/program-switch'
import { meQueryOptions, programSetupOptionsQueryOptions, templatesQueryOptions, todayQueryOptions } from '~/lib/query-options'
import { loadRouteQueries, loadRouteQuery } from '~/lib/route-loading'
import { startProgramFn } from '~/server/api'
import type {
  MovementRole,
  ProgramSetupOptions,
  ProgramSetupPreviewMovement,
  ProgramSetupPreviewSession,
  ProgramStartAccessoryAdditionInput,
  ProgramStartMovementOverrideInput,
  ProgramStateDefaults,
  ProgramStateInput,
  ProgramTemplateSummary,
  TodayPayload,
  Unit,
  UserProfile,
} from '~/types/training'
import { ConfirmDialog, EmptyState, Page, PageHeader, PageLoadError, PageSkeleton } from '~/components/ui'

export const Route = createFileRoute('/templates/$templateId/start')({
  loader: async ({ context, params }) => {
    await loadRouteQuery(context.queryClient, templatesQueryOptions())
    if ((context as any).user) {
      await loadRouteQueries(context.queryClient, [
        meQueryOptions(),
        todayQueryOptions(),
        programSetupOptionsQueryOptions(params.templateId),
      ])
    }
  },
  component: TemplateStartRoute,
})

type AccessoryAdditionDraft = ProgramStartAccessoryAdditionInput & {
  clientId: string
}

type WeekPreviewOption = {
  key: string
  week: ProgramSetupOptions['previewWeeks'][number]
  weeks: ProgramSetupOptions['previewWeeks']
  label: string
  detail: string | null
}

function TemplateStartRoute() {
  const router = useRouter()
  const { templateId } = Route.useParams()
  const user = (Route.useRouteContext() as any).user
  const templatesQuery = useQuery(templatesQueryOptions())
  const meQuery = useQuery({
    ...meQueryOptions(),
    enabled: Boolean(user),
  })
  const todayQuery = useQuery({
    ...todayQueryOptions(),
    enabled: Boolean(user),
  })
  const setupQuery = useQuery({
    ...programSetupOptionsQueryOptions(templateId),
    enabled: Boolean(user),
  })

  if (templatesQuery.isPending) return <PageSkeleton />
  if (templatesQuery.isError) return <PageLoadError error={templatesQuery.error} onRetry={() => void templatesQuery.refetch()} />

  const template = templatesQuery.data.find((item) => item.id === templateId)

  if (!template) {
    return (
      <Page>
        <EmptyState
          title="Programme unavailable"
          action={<Button onClick={() => router.navigate({ to: '/templates' })}>Back to templates</Button>}
        >
          This programme is no longer available.
        </EmptyState>
      </Page>
    )
  }

  if (!user) {
    return (
      <Page>
        <EmptyState
          title="Sign in to start this programme"
          action={<Button onClick={() => router.navigate({ to: '/auth' })}>Sign in</Button>}
        >
          Programme setup and saved defaults are tied to your account.
        </EmptyState>
      </Page>
    )
  }

  if (meQuery.isPending || todayQuery.isPending || setupQuery.isPending) return <PageSkeleton />
  if (meQuery.isError) return <PageLoadError error={meQuery.error} onRetry={() => void meQuery.refetch()} />
  if (todayQuery.isError) return <PageLoadError error={todayQuery.error} onRetry={() => void todayQuery.refetch()} />
  if (setupQuery.isError) return <PageLoadError error={setupQuery.error} onRetry={() => void setupQuery.refetch()} />

  if (!meQuery.data) {
    return (
      <Page>
        <EmptyState title="Profile unavailable">Sign in again to start a programme.</EmptyState>
      </Page>
    )
  }

  return (
    <LoadedTemplateStartRoute
      template={template}
      me={meQuery.data}
      today={todayQuery.data}
      setupOptions={setupQuery.data}
    />
  )
}

function LoadedTemplateStartRoute({
  template,
  me,
  today,
  setupOptions,
}: {
  template: ProgramTemplateSummary
  me: UserProfile
  today: TodayPayload
  setupOptions: ProgramSetupOptions
}) {
  const router = useRouter()
  const [activeWeekIndex, setActiveWeekIndex] = useState(0)
  const [showSwitchConfirm, setShowSwitchConfirm] = useState(false)
  const [showDefaultsModal, setShowDefaultsModal] = useState(false)
  const [showProgrammeInfo, setShowProgrammeInfo] = useState(false)
  const [startError, setStartError] = useState<string | null>(null)
  const [movementOverrides, setMovementOverrides] = useState<ProgramStartMovementOverrideInput[]>([])
  const [accessoryAdditions, setAccessoryAdditions] = useState<AccessoryAdditionDraft[]>([])
  const [trainingMaxPercent, setTrainingMaxPercent] = useState(DEFAULT_TRAINING_MAX_PERCENT)
  const [workingLoadPercent, setWorkingLoadPercent] = useState(DEFAULT_WORKING_LOAD_PERCENT)
  const [stateValues, setStateValues] = useState<ProgramStateInput[]>(() =>
    stateValuesForProfileTemplate(template, me, DEFAULT_TRAINING_MAX_PERCENT, DEFAULT_WORKING_LOAD_PERCENT),
  )
  const activeSessionId = today.activeSession?.sessionId
  const weekOptions = useMemo(() => compactWeekPreviewOptions(setupOptions.previewWeeks), [setupOptions.previewWeeks])
  const activeWeekOption = weekOptions.find((option) => option.week.index === activeWeekIndex) ?? weekOptions[0]
  const activeWeek = activeWeekOption?.week ?? setupOptions.previewWeeks[0]
  const customizationCount = movementOverrides.length + accessoryAdditions.length

  const visibleState = useMemo(
    () =>
      template.requiredState.length
        ? template.requiredState
            .map((required) => stateValues.find((state) => state.key === required.key))
            .filter(Boolean) as ProgramStateInput[]
        : [],
    [stateValues, template.requiredState],
  )
  const missingRequiredState = useMemo(
    () => visibleState.filter((state) => !hasUsableStateValue(state.value)),
    [visibleState],
  )
  const hasTrainingMaxState = visibleState.some((state) => state.type === 'training_max')
  const hasWorkingLoadState = visibleState.some((state) => state.type === 'working_load')

  const updateStateValue = (key: string, value: number | null) => {
    setStateValues((current) =>
      current.map((state) =>
        state.key === key
          ? {
              ...state,
              value,
            }
          : state,
      ),
    )
  }

  const updateDerivedStatePercent = (stateType: 'training_max' | 'working_load', percent: number) => {
    if (stateType === 'training_max') setTrainingMaxPercent(percent)
    if (stateType === 'working_load') setWorkingLoadPercent(percent)
    setStateValues((current) => {
      if (!current.some((state) => state.type === stateType)) return current
      return current.map((state) => {
        if (state.type !== stateType) return state
        const suggested = suggestedLoadFromOneRepMax(me.programStateDefaults, state.movementId, percent, me.rounding)
        return {
          ...state,
          value: suggested ?? state.value,
        }
      })
    })
  }

  const startMutation = useMutation({
    mutationFn: (input: { replaceActiveProgram?: boolean }) => {
      const startStateValues = template.requiredState.length
        ? stateValues.filter((state) => template.requiredState.some((required) => required.key === state.key))
        : []

      return startProgramFn({
        data: {
          templateId: template.id,
          stateValues: startStateValues,
          movementOverrides: movementOverrides.length ? movementOverrides : undefined,
          accessoryAdditions: accessoryAdditions.length
            ? accessoryAdditions.map((addition) => ({
                sessionId: addition.sessionId,
                sourceSlotId: addition.sourceSlotId,
                movementId: addition.movementId,
                phaseKey: addition.phaseKey,
              }))
            : undefined,
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
      const message = getApiErrorMessage(error, 'Unable to start programme')
      setStartError(message)
      notifications.show({ color: 'danger', title: 'Could not start programme', message })
    },
    onSuccess: async () => {
      notifications.show({ color: 'success', title: 'Programme started', message: 'Your next workout is ready.' })
      setShowSwitchConfirm(false)
      const queryClient = router.options.context.queryClient
      const invalidations = [
        queryClient.invalidateQueries({ queryKey: ['activeProgram'] }),
        queryClient.invalidateQueries({ queryKey: ['today'] }),
        queryClient.invalidateQueries({ queryKey: ['programOverview'] }),
        queryClient.invalidateQueries({ queryKey: ['history'] }),
      ]
      if (activeSessionId) {
        invalidations.push(queryClient.invalidateQueries({ queryKey: ['session', activeSessionId] }))
      }
      await Promise.all(invalidations)
      await router.invalidate()
      await router.navigate({ to: '/today' })
    },
  })

  const handleMovementOverrideChange = (movement: ProgramSetupPreviewMovement, replacementMovementId: string) => {
    if (!isSetupConfigurableRole(movement.role)) return
    const role = movement.role
    setMovementOverrides((current) => {
      const withoutSlot = current.filter(
        (override) =>
          !(override.slotId === movement.slotId && override.phaseKey === movement.setupPhaseKey && override.role === role),
      )
      if (replacementMovementId === movement.defaultMovementId) return withoutSlot
      return [
        ...withoutSlot,
        {
          slotId: movement.slotId,
          phaseKey: movement.setupPhaseKey,
          role,
          originalMovementId: movement.defaultMovementId,
          replacementMovementId,
        },
      ]
    })
  }

  const handleAddAccessory = (addition: ProgramStartAccessoryAdditionInput) => {
    setAccessoryAdditions((current) => [
      ...current,
      {
        ...addition,
        clientId: accessoryDraftClientId(addition),
      },
    ])
  }

  const handleRemoveAccessory = (clientId: string) => {
    setAccessoryAdditions((current) => current.filter((addition) => addition.clientId !== clientId))
  }

  const requestStartProgram = () => {
    setStartError(null)
    if (missingRequiredState.length) {
      setStartError(missingRequiredLoadMessage(missingRequiredState))
      return
    }
    if (shouldConfirmProgramStart(today)) {
      setShowSwitchConfirm(true)
      return
    }
    startMutation.mutate({})
  }

  const confirmSwitch = () => {
    setStartError(null)
    if (missingRequiredState.length) {
      setStartError(missingRequiredLoadMessage(missingRequiredState))
      setShowSwitchConfirm(false)
      return
    }
    startMutation.mutate({ replaceActiveProgram: true })
  }

  return (
    <Page className="max-w-[1200px] pb-44 md:px-8 lg:px-10 lg:pb-8">
      <Link
        to="/templates"
        className="mb-3 inline-flex items-center gap-1.5 text-xs font-bold text-[var(--mantine-color-dimmed)] transition hover:text-[var(--mantine-color-text)]"
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

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-start">
        <div className="min-w-0 space-y-4">
          <div className="grid gap-2 sm:grid-cols-3">
            <StartInfoMetric label="Schedule" value={`${template.daysPerWeek} days/wk`} />
            <StartInfoMetric label="Progression" value={template.progressionLabel} />
            <StartInfoMetric label="Complexity" value={template.complexity} />
          </div>

          {activeWeek ? (
            <section>
              <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div className="min-w-0">
                  <p className="vf-section-label">Week plan</p>
                  <h2 className="mt-1 text-lg font-extrabold leading-tight">{weekOptionHeading(activeWeekOption)}</h2>
                  <p className="mt-1 max-w-3xl text-sm text-[var(--mantine-color-dimmed)]">{activeWeek.summary}</p>
                  {activeWeekOption?.detail ? (
                    <p className="mt-1 text-xs font-semibold text-[var(--mantine-color-dimmed)]">{activeWeekOption.detail}</p>
                  ) : null}
                </div>
                {weekOptions.length > 1 ? (
                  <div className="flex max-w-full gap-2 overflow-x-auto pb-1 no-scrollbar sm:pb-0">
                    {weekOptions.map((option) => (
                      <button
                        key={option.key}
                        className={`min-h-8 shrink-0 rounded-md border px-3 py-1.5 text-xs font-bold transition ${
                          option.week.index === activeWeek.index
                            ? 'border-[var(--mantine-primary-color-filled)] bg-[var(--mantine-primary-color-filled)] text-white'
                            : 'border-[var(--mantine-color-default-border)] bg-[var(--mantine-color-default)] text-[var(--mantine-color-dimmed)] hover:border-[var(--vf-action-border)] hover:text-[var(--mantine-color-text)]'
                        }`}
                        onClick={() => setActiveWeekIndex(option.week.index)}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>

              <div className="grid gap-3">
                {activeWeek.sessions.map((session) => (
                  <ProgramDayCard
                    key={`${activeWeek.index}-${session.id}`}
                    session={session}
                    units={me.units}
                    setupOptions={setupOptions}
                    movementOverrides={movementOverrides}
                    accessoryAdditions={accessoryAdditions}
                    onMovementOverrideChange={handleMovementOverrideChange}
                    onAddAccessory={handleAddAccessory}
                    onRemoveAccessory={handleRemoveAccessory}
                  />
                ))}
              </div>
            </section>
          ) : (
            <EmptyState title="No preview available">This programme does not have a setup preview yet.</EmptyState>
          )}
        </div>

        <StartSummaryPanel
          className="hidden lg:sticky lg:top-16 lg:block"
          units={me.units}
          rounding={me.rounding}
          visibleState={visibleState}
          missingRequiredState={missingRequiredState}
          hasTrainingMaxState={hasTrainingMaxState}
          hasWorkingLoadState={hasWorkingLoadState}
          customizationCount={customizationCount}
          hasActiveProgram={Boolean(today.activeProgram)}
          startError={startError}
          isPending={startMutation.isPending}
          onStart={requestStartProgram}
          onViewDefaults={() => setShowDefaultsModal(true)}
        />
      </div>

      <div className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-30 border-t border-[var(--mantine-color-default-border)] bg-[color:var(--mantine-color-default)/0.96] p-3 shadow-[0_-12px_36px_rgb(0_0_0/0.12)] backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-2">
          {startError ? (
            <p className="rounded-md border border-[var(--vf-danger-border)] bg-[var(--vf-danger-soft)] px-3 py-2 text-xs text-[var(--vf-danger-text)]">
              {startError}
            </p>
          ) : null}
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0 text-xs">
              <p className="truncate font-extrabold">{template.name}</p>
              <p className="truncate text-[var(--mantine-color-dimmed)]">
                {defaultsSummary(me.units, me.rounding, visibleState)}
              </p>
            </div>
            <div className="flex shrink-0 gap-2">
              <SetupValuesButton
                disabled={missingRequiredState.length > 0}
                label="Values"
                onClick={() => setShowDefaultsModal(true)}
              />
              <Button disabled={startMutation.isPending || missingRequiredState.length > 0} onClick={requestStartProgram}>
                <Check size={16} />
                Start
              </Button>
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
        weekOptions={weekOptions}
        onClose={() => setShowProgrammeInfo(false)}
      />

      <ConfirmDialog
        open={showSwitchConfirm}
        title="Replace active programme?"
        confirmLabel="Replace programme"
        confirmVariant="danger"
        isPending={startMutation.isPending}
        onCancel={() => setShowSwitchConfirm(false)}
        onConfirm={confirmSwitch}
      >
        <div className="space-y-2">
          <p>
            You already have{' '}
            <span className="font-semibold text-[var(--mantine-color-text)]">
              {today.activeProgram?.title ?? 'an active programme'}
            </span>{' '}
            active.
          </p>
          <p>
            Starting <span className="font-semibold text-[var(--mantine-color-text)]">{template.name}</span> will archive the
            current programme and make this your new active programme.
          </p>
          {today.activeSession ? (
            <p>Your workout in progress will be marked as abandoned. Saved lifts will be retained.</p>
          ) : null}
        </div>
      </ConfirmDialog>
    </Page>
  )
}

function ProgramDayCard({
  session,
  units,
  setupOptions,
  movementOverrides,
  accessoryAdditions,
  onMovementOverrideChange,
  onAddAccessory,
  onRemoveAccessory,
}: {
  session: ProgramSetupPreviewSession
  units: Unit
  setupOptions: ProgramSetupOptions
  movementOverrides: ProgramStartMovementOverrideInput[]
  accessoryAdditions: AccessoryAdditionDraft[]
  onMovementOverrideChange: (movement: ProgramSetupPreviewMovement, replacementMovementId: string) => void
  onAddAccessory: (addition: ProgramStartAccessoryAdditionInput) => void
  onRemoveAccessory: (clientId: string) => void
}) {
  const setupSession = setupOptions.sessions.find((item) => item.id === session.id)
  const sessionAdditions = accessoryAdditions.filter((addition) => addition.sessionId === session.id)

  return (
    <Card className="p-0">
      <div className="border-b border-[var(--mantine-color-default-border)] p-3 sm:p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge color="neutral">{session.label}</Badge>
              <span className="text-sm font-extrabold">{session.title}</span>
            </div>
            <p className="mt-1 text-xs text-[var(--mantine-color-dimmed)]">{session.movementSummary}</p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-[var(--mantine-color-dimmed)]">{session.estimatedMinutes} min</span>
          </div>
        </div>
      </div>

      <div className="grid gap-1.5 p-2 sm:p-3">
        {session.movements.map((movement) => (
          <MovementPreviewRow
            key={`${movement.slotId}-${movement.phaseKey}`}
            movement={movement}
            movementOverrides={movementOverrides}
            editable
            onMovementOverrideChange={onMovementOverrideChange}
          />
        ))}

        {sessionAdditions.map((addition) => {
          const source = setupSession?.accessoryPrescriptions.find((item) => item.sourceSlotId === addition.sourceSlotId)
          return (
            <div
              key={addition.clientId}
              className="grid gap-2 rounded-md border border-[var(--vf-action-border)] bg-[var(--vf-action-soft)] p-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
            >
              <div className="min-w-0">
                <Badge color="action" size="xs">Added accessory</Badge>
                <p className="mt-1 truncate text-sm font-extrabold">{getMovementName(addition.movementId)}</p>
                <p className="truncate text-xs text-[var(--mantine-color-dimmed)]">
                  {source?.targetSummary ?? 'Accessory work'} · {units}
                </p>
              </div>
              <Button color="danger" variant="light" onClick={() => onRemoveAccessory(addition.clientId)}>
                <Trash2 size={14} />
                Remove
              </Button>
            </div>
          )
        })}

        {setupSession?.accessoryPrescriptions.length ? (
          <DayAccessoryAddForm
            setupSession={setupSession}
            setupOptions={setupOptions}
            onAddAccessory={onAddAccessory}
          />
        ) : null}
      </div>
    </Card>
  )
}

function MovementPreviewRow({
  movement,
  movementOverrides,
  editable = false,
  onMovementOverrideChange,
}: {
  movement: ProgramSetupPreviewMovement
  movementOverrides: ProgramStartMovementOverrideInput[]
  editable?: boolean
  onMovementOverrideChange: (movement: ProgramSetupPreviewMovement, replacementMovementId: string) => void
}) {
  const override = movementOverrides.find(
    (item) => item.slotId === movement.slotId && item.phaseKey === movement.setupPhaseKey && item.role === movement.role,
  )
  const selectedMovementId = override?.replacementMovementId ?? movement.defaultMovementId
  const selectedMovementName = selectedMovementId === movement.defaultMovementId
    ? movement.defaultMovementName
    : getMovementName(selectedMovementId)
  const canSwap = isSetupConfigurableRole(movement.role) && movement.replacementOptions.length > 0
  const changed = Boolean(override)

  return (
    <div
      className={`grid gap-2 rounded-md border px-2.5 py-2 sm:px-3 ${
        editable && canSwap ? 'md:grid-cols-[minmax(0,1fr)_minmax(10rem,16rem)_auto] md:items-center' : 'sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center'
      } ${
        changed
          ? 'border-[var(--vf-action-border)] bg-[var(--vf-action-soft)]'
          : 'border-[var(--mantine-color-default-border)] bg-[var(--vf-surface-2)]'
      }`}
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <Badge color={movement.role === 'main' ? 'neutral' : movement.role === 'variation' ? 'action' : 'success'} size="xs">
            {movement.roleLabel}
          </Badge>
          {changed ? <Badge color="warning" size="xs">Changed</Badge> : null}
        </div>
        <p className="mt-0.5 truncate text-sm font-extrabold">{selectedMovementName}</p>
        {changed ? (
          <p className="truncate text-[10px] text-[var(--mantine-color-dimmed)]">
            Default: {movement.defaultMovementName}
          </p>
        ) : null}
        <p className="truncate text-[11px] text-[var(--mantine-color-dimmed)]">{movement.targetSummary}</p>
      </div>

      {editable && canSwap ? (
        <>
          <select
            className="min-h-9 rounded-md border border-[var(--mantine-color-default-border)] bg-[var(--mantine-color-default)] px-2.5 text-sm font-semibold"
            value={selectedMovementId}
            aria-label={`Swap ${movement.defaultMovementName}`}
            onChange={(event) => onMovementOverrideChange(movement, event.target.value)}
          >
            <option value={movement.defaultMovementId}>Default: {movement.defaultMovementName}</option>
            {movement.replacementOptions.map((option) => (
              <option key={option.movementId} value={option.movementId}>
                {option.movementName}
              </option>
            ))}
          </select>
          <Button
            variant="default"
            size="xs"
            disabled={!changed}
            onClick={() => onMovementOverrideChange(movement, movement.defaultMovementId)}
          >
            <RotateCcw size={14} />
            Reset
          </Button>
        </>
      ) : canSwap ? (
        <div className="text-xs font-bold text-[var(--mantine-color-dimmed)]">
          Customizable
        </div>
      ) : (
        <div className="flex items-center gap-1.5 text-[11px] font-bold text-[var(--mantine-color-dimmed)] sm:justify-end">
          <Lock size={13} />
          Locked
        </div>
      )}
    </div>
  )
}

function DayAccessoryAddForm({
  setupSession,
  setupOptions,
  onAddAccessory,
}: {
  setupSession: ProgramSetupOptions['sessions'][number]
  setupOptions: ProgramSetupOptions
  onAddAccessory: (addition: ProgramStartAccessoryAdditionInput) => void
}) {
  const [open, setOpen] = useState(false)
  const [sourceSlotId, setSourceSlotId] = useState(setupSession.accessoryPrescriptions[0]?.sourceSlotId ?? '')
  const [movementId, setMovementId] = useState(setupOptions.accessoryCatalog[0]?.movementId ?? '')
  const effectiveSourceSlotId = setupSession.accessoryPrescriptions.some((item) => item.sourceSlotId === sourceSlotId)
    ? sourceSlotId
    : setupSession.accessoryPrescriptions[0]?.sourceSlotId ?? ''
  const canAdd = Boolean(effectiveSourceSlotId && movementId)

  return (
    <div className="rounded-md border border-dashed border-[var(--mantine-color-default-border)] bg-[var(--mantine-color-default)] p-2.5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-extrabold">Optional accessory</p>
          <p className="mt-0.5 text-xs text-[var(--mantine-color-dimmed)]">
            Copy one of this day&apos;s accessory prescriptions.
          </p>
        </div>
        <Button variant="default" size="xs" onClick={() => setOpen((current) => !current)}>
          <Plus size={14} />
          Add accessory
        </Button>
      </div>

      {open ? (
        <div className="mt-2 grid gap-2 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] md:items-end">
          <label className="grid gap-1">
            <span className="text-[10px] font-bold uppercase text-[var(--mantine-color-dimmed)]">Prescription</span>
            <select
              className="min-h-9 rounded-md border border-[var(--mantine-color-default-border)] bg-[var(--vf-surface-2)] px-2.5 text-sm"
              value={effectiveSourceSlotId}
              onChange={(event) => setSourceSlotId(event.target.value)}
            >
              {setupSession.accessoryPrescriptions.map((option) => (
                <option key={option.sourceSlotId} value={option.sourceSlotId}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1">
            <span className="text-[10px] font-bold uppercase text-[var(--mantine-color-dimmed)]">Movement</span>
            <select
              className="min-h-9 rounded-md border border-[var(--mantine-color-default-border)] bg-[var(--vf-surface-2)] px-2.5 text-sm"
              value={movementId}
              onChange={(event) => setMovementId(event.target.value)}
            >
              {setupOptions.accessoryCatalog.map((movement) => (
                <option key={movement.movementId} value={movement.movementId}>
                  {movement.movementName}
                </option>
              ))}
            </select>
          </label>
          <Button
            size="xs"
            disabled={!canAdd}
            onClick={() => {
              onAddAccessory({
                sessionId: setupSession.id,
                sourceSlotId: effectiveSourceSlotId,
                movementId,
              })
              setOpen(false)
            }}
          >
            <Plus size={14} />
            Add
          </Button>
        </div>
      ) : null}
    </div>
  )
}

function SetupValuesButton({
  className,
  disabled,
  fullWidth = false,
  label,
  onClick,
}: {
  className?: string
  disabled: boolean
  fullWidth?: boolean
  label: string
  onClick: () => void
}) {
  const buttonClassName = `${fullWidth ? 'w-full' : ''} ${disabled ? '' : className ?? ''}`.trim() || undefined
  const button = (
    <Button
      variant="default"
      className={buttonClassName}
      disabled={disabled}
      style={disabled ? { pointerEvents: 'none' } : undefined}
      onClick={disabled ? undefined : onClick}
    >
      <Settings size={14} />
      {label}
    </Button>
  )

  if (!disabled) return button

  return (
    <Popover withArrow withinPortal position="top" width={280} shadow="md">
      <Popover.Target>
        <span className={`${fullWidth ? 'block w-full' : 'inline-flex'} ${className ?? ''}`.trim()}>
          {button}
        </span>
      </Popover.Target>
      <Popover.Dropdown>
        <div className="space-y-3">
          <p className="text-xs leading-relaxed text-[var(--mantine-color-dimmed)]">
            Set your estimated 1RMs in <StrengthEstimatesLink /> first. Sheetless uses them to suggest this
            programme&apos;s starting values.
          </p>
          <Button component="a" href="/settings#programme-loads" size="xs" className="w-full">
            <Settings size={14} />
            Open Strength Estimates
          </Button>
        </div>
      </Popover.Dropdown>
    </Popover>
  )
}

function MissingStrengthEstimatesNotice({
  className,
  stateValues,
}: {
  className: string
  stateValues: ProgramStateInput[]
}) {
  const labels = stateValues.map((state) => getMovementName(state.movementId))
  const programmeValue = programmeValueLabel(stateValues)

  return (
    <p className={className}>
      Add {stateValues.length} strength estimate{stateValues.length === 1 ? '' : 's'}
      {labels.length ? <> for {labels.join(', ')}</> : null} in <StrengthEstimatesLink /> before starting.
      Sheetless uses them to suggest this programme&apos;s {programmeValue}.
    </p>
  )
}

function StrengthEstimatesLink({ children = 'Settings > Strength Estimates' }: { children?: ReactNode }) {
  return (
    <a
      href="/settings#programme-loads"
      className="font-extrabold text-[var(--vf-action-text)] underline underline-offset-2 hover:text-[var(--mantine-primary-color-filled)]"
    >
      {children}
    </a>
  )
}

function StartSummaryPanel({
  className,
  units,
  rounding,
  visibleState,
  missingRequiredState,
  hasTrainingMaxState,
  hasWorkingLoadState,
  customizationCount,
  hasActiveProgram,
  startError,
  isPending,
  onStart,
  onViewDefaults,
}: {
  className?: string
  units: Unit
  rounding: number
  visibleState: ProgramStateInput[]
  missingRequiredState: ProgramStateInput[]
  hasTrainingMaxState: boolean
  hasWorkingLoadState: boolean
  customizationCount: number
  hasActiveProgram: boolean
  startError: string | null
  isPending: boolean
  onStart: () => void
  onViewDefaults: () => void
}) {
  return (
    <Card className={`space-y-4 p-4 ${className ?? ''}`}>
      <div>
        <p className="vf-section-label">Starting values</p>
        <p className="mt-1 text-sm font-extrabold">{defaultsSummary(units, rounding, visibleState)}</p>
        <p className="mt-1 text-xs text-[var(--mantine-color-dimmed)]">
          {hasWorkingLoadState
            ? 'Working loads are suggested from your saved e1RMs for this programme.'
            : hasTrainingMaxState
              ? 'Training maxes are suggested from your saved e1RMs for this programme.'
              : 'New programmes keep programme-scoped values.'}
        </p>
        <SetupValuesButton
          className="mt-3"
          disabled={missingRequiredState.length > 0}
          fullWidth
          label="Set up values"
          onClick={onViewDefaults}
        />
      </div>

      <div className="rounded-md border border-[var(--mantine-color-default-border)] bg-[var(--vf-surface-2)] p-3">
        <p className="text-[10px] font-bold uppercase text-[var(--mantine-color-dimmed)]">Customizations</p>
        <p className="mt-1 text-sm font-extrabold">
          {customizationCount ? `${customizationCount} selected` : 'Using defaults'}
        </p>
      </div>

      {hasActiveProgram ? (
        <p className="rounded-md border border-[var(--vf-warning-border)] bg-[var(--vf-warning-soft)] p-3 text-xs text-[var(--vf-warning-text)]">
          Starting will ask before replacing your active programme.
        </p>
      ) : null}

      {missingRequiredState.length ? (
        <MissingStrengthEstimatesNotice
          className="rounded-md border border-[var(--vf-warning-border)] bg-[var(--vf-warning-soft)] p-3 text-xs text-[var(--vf-warning-text)]"
          stateValues={missingRequiredState}
        />
      ) : null}

      {startError ? (
        <p className="rounded-md border border-[var(--vf-danger-border)] bg-[var(--vf-danger-soft)] p-3 text-xs text-[var(--vf-danger-text)]">
          {startError}
        </p>
      ) : null}

      <Button className="w-full" disabled={isPending || missingRequiredState.length > 0} onClick={onStart}>
        <Check size={16} />
        Start programme
      </Button>
    </Card>
  )
}

function DefaultsModal({
  opened,
  units,
  rounding,
  profileDefaults,
  visibleState,
  missingRequiredState,
  trainingMaxPercent,
  workingLoadPercent,
  hasTrainingMaxState,
  hasWorkingLoadState,
  onTrainingMaxPercentChange,
  onWorkingLoadPercentChange,
  onStateValueChange,
  onClose,
}: {
  opened: boolean
  units: Unit
  rounding: number
  profileDefaults: ProgramStateDefaults
  visibleState: ProgramStateInput[]
  missingRequiredState: ProgramStateInput[]
  trainingMaxPercent: number
  workingLoadPercent: number
  hasTrainingMaxState: boolean
  hasWorkingLoadState: boolean
  onTrainingMaxPercentChange: (value: number) => void
  onWorkingLoadPercentChange: (value: number) => void
  onStateValueChange: (key: string, value: number | null) => void
  onClose: () => void
}) {
  return (
    <Modal opened={opened} onClose={onClose} title="Programme start values" size="xl">
      <div className="space-y-4">
        <div className="grid gap-2 sm:grid-cols-3">
          <StartInfoMetric label="Units" value={units} />
          <StartInfoMetric label="Rounding" value={rounding} />
          <StartInfoMetric label="Programme values" value={visibleState.length || 'None'} />
        </div>

        {visibleState.length ? (
          <div>
            <p className="text-sm font-extrabold">
              {hasWorkingLoadState ? 'Set suggested working loads' : 'Use or adjust training maxes'}
            </p>
            <p className="mt-1 text-xs leading-relaxed text-[var(--mantine-color-dimmed)]">
              {hasWorkingLoadState
                ? 'Current-load programmes start from working loads. Sheetless suggests them from your saved estimated 1RMs, then saves the chosen values only to this programme.'
                : 'Training maxes start as conservative percentages of your saved estimated 1RMs. Any edits here are copied only into this programme.'}
            </p>
            {hasTrainingMaxState ? (
              <p className="mt-1 text-[11px] font-semibold text-[var(--mantine-color-dimmed)]">
                If the programme feels too hard or too easy later, adjust the programme training max rather than changing every planned load.
              </p>
            ) : null}
          </div>
        ) : null}

        {hasTrainingMaxState ? (
          <div className="rounded-md border border-[var(--mantine-color-default-border)] bg-[var(--vf-surface-2)] p-3">
            <div className="flex items-center justify-between gap-3">
              <span className="text-[10px] font-bold uppercase tracking-wide text-[var(--mantine-color-dimmed)]">
                Programme training max
              </span>
              <span className="text-sm font-extrabold">{trainingMaxPercent}% of estimated 1RM</span>
            </div>
            <Slider
              className="mt-3"
              min={MIN_TRAINING_MAX_PERCENT}
              max={MAX_TRAINING_MAX_PERCENT}
              step={1}
              value={trainingMaxPercent}
              label={(value) => `${value}%`}
              marks={[
                { value: 80, label: '80%' },
                { value: 90, label: '90%' },
                { value: 95, label: '95%' },
              ]}
              onChange={onTrainingMaxPercentChange}
            />
          </div>
        ) : null}

        {hasWorkingLoadState ? (
          <div className="rounded-md border border-[var(--mantine-color-default-border)] bg-[var(--vf-surface-2)] p-3">
            <div className="flex items-center justify-between gap-3">
              <span className="text-[10px] font-bold uppercase tracking-wide text-[var(--mantine-color-dimmed)]">
                Starting working load
              </span>
              <span className="text-sm font-extrabold">{workingLoadPercent}% of estimated 1RM</span>
            </div>
            <Slider
              className="mt-3"
              min={MIN_WORKING_LOAD_PERCENT}
              max={MAX_WORKING_LOAD_PERCENT}
              step={1}
              value={workingLoadPercent}
              label={(value) => `${value}%`}
              marks={[
                { value: 60, label: '60%' },
                { value: 75, label: '75%' },
                { value: 90, label: '90%' },
              ]}
              onChange={onWorkingLoadPercentChange}
            />
          </div>
        ) : null}

        {visibleState.length ? (
          <div>
            <p className="vf-section-label">Programme-scoped values</p>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {visibleState.map((state) => {
                const oneRepMax = profileLoadDefault(profileDefaults[oneRepMaxKeyForMovement(state.movementId)])
                return (
                  <div
                    key={state.key}
                    className={`rounded-md border p-3 ${
                      hasUsableStateValue(state.value)
                        ? 'border-[var(--mantine-color-default-border)] bg-[var(--vf-surface-2)]'
                        : 'border-[var(--vf-warning-border)] bg-[var(--vf-warning-soft)]'
                    }`}
                  >
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-extrabold">{getMovementName(state.movementId)}</p>
                        <p className="mt-0.5 text-[10px] font-bold uppercase text-[var(--mantine-color-dimmed)]">
                          {formatStateType(state.type)}
                        </p>
                      </div>
                      <Badge color={hasUsableStateValue(state.value) ? 'success' : 'warning'} size="xs">
                        {hasUsableStateValue(state.value) ? 'Set' : 'Unset'}
                      </Badge>
                    </div>
                    <TextInput
                      classNames={{ input: 'text-right' }}
                      type="number"
                      placeholder="Unset"
                      value={state.value ?? ''}
                      rightSection={<span className="text-xs font-bold text-[var(--mantine-color-dimmed)]">{units}</span>}
                      onChange={(event) => onStateValueChange(state.key, loadValueFromInput(event.target.value))}
                    />
                    <p className="mt-2 text-[11px] leading-relaxed text-[var(--mantine-color-dimmed)]">
                      {state.type === 'working_load'
                        ? oneRepMax
                          ? `Suggested from ${formatNumber(oneRepMax)} ${units} estimated 1RM. You can override it for this programme.`
                          : 'No saved estimated 1RM was found for this movement. Set it in Strength Estimates before choosing working loads.'
                        : oneRepMax
                          ? `Suggested from ${formatNumber(oneRepMax)} ${units} estimated 1RM. Editing it here will not change Settings.`
                          : 'No saved estimated 1RM was found for this movement. Set it in Strength Estimates before choosing training maxes.'}
                    </p>
                  </div>
                )
              })}
            </div>
          </div>
        ) : (
          <p className="rounded-md border border-[var(--mantine-color-default-border)] bg-[var(--vf-surface-2)] p-3 text-sm text-[var(--mantine-color-dimmed)]">
            This programme does not need saved strength estimates. Loads can be selected while logging.
          </p>
        )}

        {missingRequiredState.length ? (
          <MissingStrengthEstimatesNotice
            className="rounded-md border border-[var(--vf-warning-border)] bg-[var(--vf-warning-soft)] p-3 text-sm text-[var(--vf-warning-text)]"
            stateValues={missingRequiredState}
          />
        ) : null}

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="default" onClick={onClose}>Close</Button>
          <Button component="a" href="/settings#programme-loads" onClick={onClose}>
            <Settings size={14} />
            Open Strength Estimates
          </Button>
        </div>
      </div>
    </Modal>
  )
}

function ProgrammeInfoModal({
  opened,
  template,
  setupOptions,
  weekOptions,
  onClose,
}: {
  opened: boolean
  template: ProgramTemplateSummary
  setupOptions: ProgramSetupOptions
  weekOptions: WeekPreviewOption[]
  onClose: () => void
}) {
  return (
    <Modal opened={opened} onClose={onClose} title="How this programme works" size="xl">
      <div className="space-y-4">
        <div className="grid gap-2 sm:grid-cols-3">
          <StartInfoMetric label="Cycle" value={`${setupOptions.previewWeeks.length} weeks`} />
          <StartInfoMetric label="Schedule" value={`${template.daysPerWeek} days/wk`} />
          <StartInfoMetric label="Progression" value={template.progressionLabel} />
        </div>

        <div>
          <p className="vf-section-label">Block patterns</p>
          <div className="mt-2 grid gap-2">
            {weekOptions.map((option) => (
              <div
                key={option.key}
                className="rounded-md border border-[var(--mantine-color-default-border)] bg-[var(--vf-surface-2)] p-3"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-extrabold">{weekOptionHeading(option)}</p>
                  {option.weeks.length > 1 ? <Badge color="neutral">{option.weeks.length} weeks</Badge> : null}
                </div>
                <p className="mt-1 text-xs text-[var(--mantine-color-dimmed)]">{option.week.summary}</p>
                {option.detail ? (
                  <p className="mt-1 text-[10px] font-semibold text-[var(--mantine-color-dimmed)]">{option.detail}</p>
                ) : null}
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-md border border-[var(--mantine-color-default-border)] bg-[var(--mantine-color-default)] p-3">
          <p className="vf-section-label">Customization rules</p>
          <p className="mt-1 text-sm text-[var(--mantine-color-dimmed)]">
            Main lifts stay locked. Variation and accessory swaps use related movements and apply from week 1. Extra
            accessories copy the selected day&apos;s accessory prescription.
          </p>
        </div>
      </div>
    </Modal>
  )
}

function StartInfoMetric({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-lg border border-[var(--mantine-color-default-border)] bg-[var(--vf-surface-2)] p-3">
      <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--mantine-color-dimmed)]">{label}</p>
      <p className="mt-1 truncate text-sm font-extrabold">{value}</p>
    </div>
  )
}

function stateValuesForProfileTemplate(
  template: ProgramTemplateSummary,
  profile: UserProfile,
  trainingMaxPercent: number,
  workingLoadPercent: number,
): ProgramStateInput[] {
  if (!template.requiredState.length) return []
  return buildProgramStartStateValues({
    unit: profile.units,
    requiredState: template.requiredState,
    defaults: profile.programStateDefaults,
    rounding: profile.rounding,
    trainingMaxPercent,
    workingLoadPercent,
  })
}

function hasUsableStateValue(value: number | null) {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
}

function loadValueFromInput(value: string) {
  if (!value.trim()) return null
  const numeric = Number(value)
  return Number.isFinite(numeric) && numeric > 0 ? numeric : null
}

function formatStateType(value: string) {
  return value.replaceAll('_', ' ')
}

function formatNumber(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1)
}

function defaultsSummary(units: Unit, rounding: number, stateValues: ProgramStateInput[]) {
  const missingCount = stateValues.filter((state) => !hasUsableStateValue(state.value)).length
  const valueSummary = stateValues.length
    ? missingCount
      ? `${missingCount} value${missingCount === 1 ? '' : 's'} unset`
      : `${stateValues.length} starting value${stateValues.length === 1 ? '' : 's'} ready`
    : 'no starting values required'
  return `${units} - round ${rounding} - ${valueSummary}`
}

function missingRequiredLoadMessage(stateValues: ProgramStateInput[]) {
  const labels = stateValues.map((state) => getMovementName(state.movementId))
  return `Missing strength estimate${labels.length === 1 ? '' : 's'} for ${labels.join(', ')}. Open Settings > Strength Estimates before choosing programme ${programmeValueLabel(stateValues)}.`
}

function programmeValueLabel(stateValues: ProgramStateInput[]) {
  if (stateValues.some((state) => state.type === 'working_load')) return 'working loads'
  if (stateValues.some((state) => state.type === 'training_max')) return 'training maxes'
  return 'starting values'
}

function compactWeekPreviewOptions(weeks: ProgramSetupOptions['previewWeeks']): WeekPreviewOption[] {
  const groups = new Map<string, ProgramSetupOptions['previewWeeks']>()
  for (const week of weeks) {
    const key = previewWeekPatternKey(week)
    groups.set(key, [...(groups.get(key) ?? []), week])
  }

  const groupEntries = Array.from(groups.entries())
  return groupEntries.map(([key, groupedWeeks], index) => {
    const week = groupedWeeks[0]!
    return {
      key,
      week,
      weeks: groupedWeeks,
      label: compactWeekOptionLabel(week, groupedWeeks, index, groupEntries.length),
      detail: compactWeekOptionDetail(groupedWeeks),
    }
  })
}

function previewWeekPatternKey(week: ProgramSetupOptions['previewWeeks'][number]) {
  return week.sessions
    .map((session) =>
      session.movements
        .map((movement) => `${movement.role}:${movement.defaultMovementId}`)
        .join(','),
    )
    .join('|')
}

function compactWeekOptionLabel(
  week: ProgramSetupOptions['previewWeeks'][number],
  weeks: ProgramSetupOptions['previewWeeks'],
  index: number,
  totalGroups: number,
) {
  if (weeks.length <= 1) return week.label
  if (totalGroups === 1) return 'Exercise layout'
  const phaseLabels = new Set(weeks.map((item) => item.phaseLabel))
  if (phaseLabels.size === 1) {
    const phase = week.phaseLabel.replace(/\s+phase$/i, '')
    return `${phase} layout`
  }
  return `Layout ${index + 1}`
}

function compactWeekOptionDetail(weeks: ProgramSetupOptions['previewWeeks']) {
  if (weeks.length <= 1) return null
  const weekRange = `${weeks[0]!.label}${weeks.length > 1 ? `-${weeks.at(-1)!.label}` : ''}`
  if (weeks.length === 2) return `Same exercises across ${weekRange}; sets and loading may vary.`
  return `Same exercises across ${weeks.length} weeks; sets and loading may vary.`
}

function weekOptionHeading(option: WeekPreviewOption | undefined) {
  if (!option) return 'Week plan'
  if (option.weeks.length <= 1) return option.week.label
  return `${option.label}`
}

function isSetupConfigurableRole(role: MovementRole): role is Extract<MovementRole, 'variation' | 'accessory'> {
  return role === 'variation' || role === 'accessory'
}

function accessoryDraftClientId(addition: ProgramStartAccessoryAdditionInput) {
  return `${addition.sessionId}-${addition.sourceSlotId}-${addition.movementId}-${Date.now()}-${Math.random().toString(36).slice(2)}`
}
