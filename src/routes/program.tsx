import { useMutation, useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { Check, ChevronDown, ChevronRight, Clock3, Info, X } from 'lucide-react'
import { useState } from 'react'
import { activeProgramQueryOptions, todayQueryOptions } from '~/lib/query-options'
import { resolveProgressionDecisionFn } from '~/server/api'
import { Button, Card, Chip, EmptyState, Page, PageHeader } from '~/components/ui'

export const Route = createFileRoute('/program')({
  loader: async ({ context }) => {
    if ((context as any).user) {
      await Promise.all([
        context.queryClient.ensureQueryData(activeProgramQueryOptions()),
        context.queryClient.ensureQueryData(todayQueryOptions()),
      ])
    }
  },
  component: ProgramRoute,
})

function ProgramRoute() {
  const user = (Route.useRouteContext() as any).user
  if (!user) {
    return (
      <Page>
        <EmptyState title="Sign in to review your program">Program timelines and anchors are account data.</EmptyState>
      </Page>
    )
  }
  return <AuthedProgram />
}

// ─── Per-template metadata ────────────────────────────────────────────────────

type WeekMeta = { label: string; type: string; days: string[] }

function getProgramMeta(templateId: string): { weeks: WeekMeta[] } {
  if (templateId === 'healthy-531-fsl') {
    const weekTypes: WeekMeta[] = [
      {
        label: '5s Week',
        type: 'Opening work',
        days: ['Squat + Lower Accessories', 'Bench + Upper Back', 'Deadlift + Posterior Chain', 'Overhead Press + Upper Back'],
      },
      {
        label: '3s Week',
        type: 'Build',
        days: ['Squat + Lower Accessories', 'Bench + Upper Back', 'Deadlift + Posterior Chain', 'Overhead Press + Upper Back'],
      },
      {
        label: '1s Week',
        type: 'Heavy review',
        days: ['Squat + Lower Accessories', 'Bench + Upper Back', 'Deadlift + Posterior Chain', 'Overhead Press + Upper Back'],
      },
      {
        label: 'Deload',
        type: 'Deload',
        days: ['Squat + Lower Accessories', 'Bench + Upper Back', 'Deadlift + Posterior Chain', 'Overhead Press + Upper Back'],
      },
    ]
    // 4 cycles × 4 weeks = 16 weeks total
    const weeks: WeekMeta[] = Array.from({ length: 16 }, (_, i) => weekTypes[i % 4])
    return { weeks }
  }

  if (templateId === 'bromley-bullmastiff') {
    const waveTypes: WeekMeta[] = [
      {
        label: 'Wave Week 1',
        type: 'Light',
        days: ['Bullmastiff Squat', 'Bullmastiff Bench', 'Bullmastiff Deadlift', 'Bullmastiff Overhead Press'],
      },
      {
        label: 'Wave Week 2',
        type: 'Medium',
        days: ['Bullmastiff Squat', 'Bullmastiff Bench', 'Bullmastiff Deadlift', 'Bullmastiff Overhead Press'],
      },
      {
        label: 'Wave Week 3',
        type: 'Heavy',
        days: ['Bullmastiff Squat', 'Bullmastiff Bench', 'Bullmastiff Deadlift', 'Bullmastiff Overhead Press'],
      },
    ]
    // 4 waves × 3 weeks = 12 weeks total
    const weeks: WeekMeta[] = Array.from({ length: 12 }, (_, i) => waveTypes[i % 3])
    return { weeks }
  }

  // Fallback: show 8 generic weeks
  const weeks: WeekMeta[] = Array.from({ length: 8 }, (_, i) => ({
    label: `Week ${i + 1}`,
    type: '',
    days: [],
  }))
  return { weeks }
}

// ─── Anchor info tooltip ──────────────────────────────────────────────────────

function AnchorInfoTip() {
  const [open, setOpen] = useState(false)
  return (
    <div className="relative inline-block">
      <button
        type="button"
        className="flex items-center text-[var(--muted)] hover:text-[var(--text)]"
        aria-label="What are anchors?"
        onClick={() => setOpen((v) => !v)}
        onBlur={() => setOpen(false)}
      >
        <Info size={14} />
      </button>
      {open ? (
        <div className="absolute right-0 top-6 z-10 w-64 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3 text-xs text-[var(--muted)] shadow-lg">
          <p className="font-bold text-[var(--text)]">What are anchors?</p>
          <p className="mt-1">
            Anchors (Training Maxes) are the reference weights your working-set percentages are
            calculated from — typically ~90% of your true 1-rep max. They increase each cycle as you
            progress.
          </p>
        </div>
      ) : null}
    </div>
  )
}

// ─── Expandable week row ──────────────────────────────────────────────────────

function WeekRow({ index, meta, isCurrent }: { index: number; meta: WeekMeta; isCurrent: boolean }) {
  const [expanded, setExpanded] = useState(isCurrent)
  return (
    <div
      className={`rounded-lg border ${
        isCurrent ? 'border-[var(--action)] bg-blue-500/10' : 'border-[var(--border)] bg-[var(--surface-2)]'
      }`}
    >
      <button
        type="button"
        className="flex w-full items-center justify-between gap-3 p-3 text-left"
        onClick={() => setExpanded((v) => !v)}
      >
        <div>
          <p className="font-bold">
            Week {index + 1}
            {meta.label ? ` · ${meta.label}` : ''}
          </p>
          {meta.type ? <p className="text-xs text-[var(--muted)]">{meta.type}</p> : null}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {isCurrent ? <Chip tone="action">Current</Chip> : null}
          {expanded ? <ChevronDown size={14} className="text-[var(--muted)]" /> : <ChevronRight size={14} className="text-[var(--muted)]" />}
        </div>
      </button>
      {expanded && meta.days.length ? (
        <div className="border-t border-[var(--border)] px-3 pb-3 pt-2">
          <ul className="space-y-1">
            {meta.days.map((day) => (
              <li key={day} className="flex items-center gap-2 text-xs text-[var(--muted)]">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--muted)]" />
                {day}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

function AuthedProgram() {
  const { data: program } = useSuspenseQuery(activeProgramQueryOptions())
  const { data: today } = useSuspenseQuery(todayQueryOptions())
  const mutation = useMutation({
    mutationFn: (data: { decisionId: string; action: 'accepted' | 'dismissed' | 'pending' }) =>
      resolveProgressionDecisionFn({ data }),
  })

  if (!program) {
    return (
      <Page>
        <EmptyState title="No active program">Start a template to see its timeline and anchors here.</EmptyState>
      </Page>
    )
  }

  const { weeks } = getProgramMeta(program.templateId)

  return (
    <Page>
      <PageHeader title={program.title} eyebrow="Program">
        Current position: week {program.currentWeekIndex + 1}
      </PageHeader>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase text-[var(--muted)]">Timeline</h2>
            <Chip tone="action">{program.status}</Chip>
          </div>
          <div className="mt-4 space-y-2">
            {weeks.map((meta, index) => (
              <WeekRow
                key={index}
                index={index}
                meta={meta}
                isCurrent={index === program.currentWeekIndex}
              />
            ))}
          </div>
        </Card>

        <div className="space-y-4">
          <Card>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <h2 className="text-sm font-bold uppercase text-[var(--muted)]">Current Anchors</h2>
                <AnchorInfoTip />
              </div>
              <Chip>{program.units}</Chip>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {program.anchors.map((anchor) => (
                <div key={anchor.movementId} className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-3">
                  <p className="text-xs text-[var(--muted)]">{anchor.movementId.replaceAll('_', ' ')}</p>
                  <p className="mt-1 text-lg font-bold">
                    {anchor.value} <span className="text-xs text-[var(--muted)]">{program.units}</span>
                  </p>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <h2 className="text-sm font-bold uppercase text-[var(--muted)]">Progression</h2>
            {today.pendingDecisions.length ? (
              <div className="mt-3 space-y-3">
                {today.pendingDecisions.map((decision) => (
                  <div key={decision.id} className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-3">
                    <p className="font-bold">{decision.movementName}</p>
                    <p className="mt-1 text-xs text-[var(--muted)]">{decision.recommendation}</p>
                    <div className="mt-3 grid grid-cols-3 gap-2">
                      <Button variant="success" onClick={() => mutation.mutate({ decisionId: decision.id, action: 'accepted' })}>
                        <Check size={14} />
                        Accept
                      </Button>
                      <Button variant="secondary" onClick={() => mutation.mutate({ decisionId: decision.id, action: 'pending' })}>
                        <Clock3 size={14} />
                        Later
                      </Button>
                      <Button variant="danger" onClick={() => mutation.mutate({ decisionId: decision.id, action: 'dismissed' })}>
                        <X size={14} />
                        Dismiss
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-sm text-[var(--muted)]">No pending recommendations.</p>
            )}
          </Card>
        </div>
      </div>
    </Page>
  )
}
