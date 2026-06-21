import { useMutation, useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import { Check, Lock, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { defaultAnchors } from '~/lib/templates'
import { meQueryOptions, templatesQueryOptions } from '~/lib/query-options'
import { startProgramFn } from '~/server/api'
import type { AnchorInput, ProgramTemplateSummary, Unit } from '~/types/training'
import { Button, Card, Chip, EmptyState, Page, PageHeader, TextInput } from '~/components/ui'

export const Route = createFileRoute('/templates')({
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(templatesQueryOptions())
    if ((context as any).user) await context.queryClient.ensureQueryData(meQueryOptions())
  },
  component: TemplatesRoute,
})

function TemplatesRoute() {
  const router = useRouter()
  const { data: templates } = useSuspenseQuery(templatesQueryOptions())
  const { data: me } = useSuspenseQuery(meQueryOptions())
  const [filter, setFilter] = useState('All')
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<ProgramTemplateSummary | null>(null)
  const [units, setUnits] = useState<Unit>(me?.units ?? 'kg')
  const [rounding, setRounding] = useState(me?.rounding ?? 2.5)
  const [anchors, setAnchors] = useState<AnchorInput[]>(defaultAnchors(me?.units ?? 'kg'))

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
    mutationFn: () => {
      if (!selected) throw new Error('No template selected')
      return startProgramFn({
        data: {
          templateId: selected.id,
          units,
          rounding,
          anchors,
        },
      })
    },
    onSuccess: async () => {
      await router.invalidate()
      await Promise.all([
        router.options.context.queryClient.invalidateQueries({ queryKey: ['activeProgram'] }),
        router.options.context.queryClient.invalidateQueries({ queryKey: ['today'] }),
      ])
      await router.navigate({ to: '/today' })
    },
  })

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

  return (
    <Page>
      <PageHeader title="Choose a program">
        Select a structured program to start your next training cycle.
      </PageHeader>

      <div className="mb-4 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" size={16} />
          <TextInput
            className="pl-9"
            placeholder="Search programs"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {['All', '5/3/1', 'Bromley', 'Base', 'Peak', 'High volume', 'Low volume'].map((item) => (
            <button
              key={item}
              className={`whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-bold ${
                filter === item
                  ? 'border-[var(--action)] bg-[var(--action)] text-white'
                  : 'border-[var(--border)] bg-[var(--surface)] text-[var(--muted)]'
              }`}
              onClick={() => setFilter(item)}
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {filtered.map((template) => (
          <TemplateCard key={template.id} template={template} onStart={() => setSelected(template)} />
        ))}
      </div>

      {selected ? (
        <div className="fixed inset-0 z-50 flex items-end bg-black/60 p-3 sm:items-center sm:justify-center">
          <Card className="w-full max-w-lg">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold">{selected.name}</h2>
                <p className="mt-1 text-sm text-[var(--muted)]">Set units, rounding, and starting anchors.</p>
              </div>
              <Button variant="ghost" onClick={() => setSelected(null)}>
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
                {anchors.map((anchor) => (
                  <label key={anchor.movementId} className="grid grid-cols-[1fr_8rem] items-center gap-3">
                    <span className="text-sm font-semibold">{anchor.movementId.replaceAll('_', ' ')}</span>
                    <TextInput
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
                  </label>
                ))}
              </div>
            </div>
            <Button className="mt-4 w-full" disabled={startMutation.isPending} onClick={() => startMutation.mutate()}>
              Start program
            </Button>
          </Card>
        </div>
      ) : null}
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
    <Card className="flex flex-col justify-between gap-4">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-base font-bold">{template.name}</h2>
          <Chip tone={template.sourceLabel === 'Bromley' ? 'warning' : 'action'}>{template.sourceLabel}</Chip>
          {!template.available ? <Chip>Later</Chip> : null}
        </div>
        <p className="mt-2 text-sm text-[var(--muted)]">{template.description}</p>
        <div className="mt-3 flex flex-wrap gap-2 text-xs text-[var(--muted)]">
          <span>{template.daysPerWeek} days/week</span>
          <span>•</span>
          <span>{template.progressionLabel}</span>
          <span>•</span>
          <span>{template.complexity}</span>
        </div>
      </div>
      {template.available ? (
        <Button onClick={onStart}>
          <Check size={16} />
          Start
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
