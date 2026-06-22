import { useMutation, useSuspenseQuery } from '@tanstack/react-query'
import { notifications } from '@mantine/notifications'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import { Check, Lock, Search } from 'lucide-react'
import { useEffect, useId, useMemo, useState } from 'react'
import { shouldConfirmProgramStart } from '~/lib/program-switch'
import { getApiErrorMessage } from '~/lib/api-error'
import { getMovementName } from '~/lib/movements'
import { defaultAnchors } from '~/lib/templates'
import { meQueryOptions, templatesQueryOptions, todayQueryOptions } from '~/lib/query-options'
import { startProgramFn } from '~/server/api'
import type { AnchorInput, ProgramTemplateSummary, Unit } from '~/types/training'
import { Button, Card, Chip, ConfirmDialog, EmptyState, Page, PageHeader, TextInput } from '~/components/ui'

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

function AuthedTemplates({
  templates,
  me,
}: {
  templates: ProgramTemplateSummary[]
  me: { units: Unit; rounding: number }
}) {
  const router = useRouter()
  const { data: today } = useSuspenseQuery(todayQueryOptions())
  const setupTitleId = useId()
  const [filter, setFilter] = useState('All')
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<ProgramTemplateSummary | null>(null)
  const [showSetup, setShowSetup] = useState(false)
  const [units, setUnits] = useState<Unit>(me?.units ?? 'kg')
  const [rounding, setRounding] = useState(me?.rounding ?? 2.5)
  const [anchors, setAnchors] = useState<AnchorInput[]>(defaultAnchors(me?.units ?? 'kg'))
  const [showSwitchConfirm, setShowSwitchConfirm] = useState(false)
  const [startError, setStartError] = useState<string | null>(null)
  const activeSessionId = today.activeSession?.sessionId

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

  const startMutation = useMutation({
    mutationFn: (input: { replaceActiveProgram?: boolean }) => {
      if (!selected) throw new Error('No template selected')
      return startProgramFn({
        data: {
          templateId: selected.id,
          units,
          rounding,
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
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs text-[var(--muted)] shadow-[var(--shadow-card)]">
            <span className="font-extrabold text-[var(--text)]">{templates.length}</span> programs available
          </span>
        }
      >
        Select a structured program to start your next training cycle.
      </PageHeader>

      <div className="mb-5 space-y-3 md:mb-6">
        <div className="relative max-w-4xl">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" size={16} />
          <TextInput
            className="pl-9"
            placeholder="Search programs"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar sm:flex-wrap sm:overflow-visible sm:pb-0">
          {['All', '5/3/1', 'Bromley', 'Base', 'Peak', 'High volume', 'Low volume'].map((item) => (
            <button
              key={item}
              className={`min-h-9 whitespace-nowrap rounded-full border px-3.5 py-2 text-xs font-bold transition ${
                filter === item
                  ? 'border-[var(--action)] bg-[var(--action)] text-white'
                  : 'border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] hover:border-[var(--action-border)] hover:text-[var(--text)]'
              }`}
              onClick={() => setFilter(item)}
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      <p className="mb-3 text-[11px] font-semibold text-[var(--muted)]">Showing {filtered.length} programs</p>

      <div
        className="grid items-stretch gap-4 md:gap-5"
        style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 22rem), 1fr))' }}
      >
        {filtered.map((template) => (
          <TemplateCard key={template.id} template={template} onStart={() => selectTemplate(template)} />
        ))}
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
            className="w-full max-w-lg"
            onClick={(event) => event.stopPropagation()}
          >
            <Card>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 id={setupTitleId} className="text-lg font-bold">
                    {selected.name}
                  </h2>
                  <p className="mt-1 text-sm text-[var(--muted)]">Set units, rounding, and starting anchors.</p>
                </div>
                <Button variant="ghost" onClick={closeSetup}>
                  Close
                </Button>
              </div>
              <div className="mt-4 grid gap-3">
                <div className="grid grid-cols-2 gap-2">
                  <label className="grid gap-1">
                    <span className="text-xs font-bold uppercase text-[var(--muted)]">Units</span>
                    <select
                      className="min-h-11 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3"
                      value={units}
                      onChange={(event) => {
                        const next = event.target.value as Unit
                        setUnits(next)
                        setAnchors(defaultAnchors(next))
                      }}
                    >
                      <option value="kg">kg</option>
                      <option value="lb">lb</option>
                    </select>
                  </label>
                  <label className="grid gap-1">
                    <span className="text-xs font-bold uppercase text-[var(--muted)]">Rounding</span>
                    <TextInput
                      type="number"
                      value={rounding}
                      onChange={(event) => setRounding(Number(event.target.value))}
                    />
                  </label>
                </div>
                <div className="grid gap-2">
                  <div>
                    <p className="vf-section-label">Starting anchors</p>
                    <p className="mt-1 text-xs text-[var(--muted)]">
                      Enter the training max used to calculate the first block of prescribed loads.
                    </p>
                  </div>
                  {anchors.map((anchor) => (
                    <label
                      key={anchor.movementId}
                      className="grid gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3 sm:grid-cols-[minmax(0,1fr)_11rem] sm:items-center"
                    >
                      <span className="min-w-0">
                        <span className="block text-sm font-extrabold text-[var(--text)]">{getMovementName(anchor.movementId)}</span>
                        <span className="mt-0.5 block text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                          {anchor.anchorType.replaceAll('_', ' ')}
                        </span>
                      </span>
                      <span className="relative block">
                        <TextInput
                          className="pr-12 text-right"
                          type="number"
                          value={anchor.value}
                          onChange={(event) =>
                            setAnchors((current) =>
                              current.map((item) =>
                                item.movementId === anchor.movementId
                                  ? { ...item, value: Number(event.target.value) }
                                  : item,
                              ),
                            )
                          }
                        />
                        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[var(--muted)]">
                          {units}
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>
              <Button className="mt-4 w-full" disabled={startMutation.isPending} onClick={requestStartProgram}>
                Start program
              </Button>
              {startError ? (
                <p className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
                  {startError}
                </p>
              ) : null}
            </Card>
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
                <span className="font-semibold text-[var(--text)]">{today.activeProgram.title}</span> active.
              </>
            ) : (
              'You already have an active program.'
            )}
          </p>
          <p>
            Starting <span className="font-semibold text-[var(--text)]">{selected?.name ?? 'a new program'}</span>{' '}
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

function TemplateCard({
  template,
  onStart,
}: {
  template: ProgramTemplateSummary
  onStart: () => void
}) {
  return (
    <Card className="group flex min-h-[18rem] flex-col gap-5 p-4 vf-card-hover md:p-5">
      <div className="flex flex-1 flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Chip tone={template.sourceLabel === 'Bromley' ? 'warning' : 'action'}>{template.sourceLabel}</Chip>
          <span className="text-[11px] font-semibold text-[var(--muted)]">{template.daysPerWeek} days/wk</span>
          <Chip tone="action" className="normal-case sm:ml-auto">
            {template.progressionLabel}
          </Chip>
        </div>

        <div>
          <h2 className="text-lg font-extrabold leading-tight tracking-tight md:text-xl">{template.name}</h2>
          <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">{template.description}</p>
        </div>

        <div className="mt-auto flex flex-wrap gap-1.5 text-[10px] text-[var(--muted)]">
          <span className="rounded bg-[var(--surface-2)] px-1.5 py-0.5 font-semibold">{template.complexity}</span>
          {template.tags.slice(0, 3).map((tag) => (
            <span key={tag} className="rounded bg-[var(--surface-2)] px-1.5 py-0.5 font-semibold">
              {tag}
            </span>
          ))}
        </div>
      </div>
      {template.available ? (
        <Button className="w-full" onClick={onStart}>
          <Check size={16} />
          Start Program
        </Button>
      ) : (
        <Button variant="secondary" disabled>
          <Lock size={16} />
          Not yet
        </Button>
      )}
    </Card>
  )
}
