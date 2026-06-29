import { Badge, Button, Modal, TextInput } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { useQuery } from '@tanstack/react-query'
import { useRouter, useRouterState } from '@tanstack/react-router'
import { Eye, Layers3, Plus, RotateCcw, Search, Sparkles, Wrench, type LucideIcon } from 'lucide-react'
import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { track } from '~/shared/lib/analytics'
import { Caption, EmptyState, Heading, Page, PageHeader, Panel, SectionLabel, Text } from '~/components'
import { programOverviewQueryOptions } from '~/domains/program/queries'
import type { ProgramOverview, ProgramTemplateSummary, TodayPayload } from '~/shared/types'
import { CustomProgramBuilder } from './CustomProgramBuilder'
import { FindMyPlanModal } from './FindMyPlanModal'
import { complexityColor, TemplateCard, TemplateGrid } from './TemplateCard'

const templateFilters = ['All', 'Custom', 'Linear', '5x5', 'Training max', 'Wave', 'Volume', 'Peak', 'High volume', 'Powerbuilding', 'Hypertrophy']

// Surface the most approachable plans first.
const COMPLEXITY_ORDER: Record<string, number> = { Beginner: 0, Intermediate: 1, Advanced: 2 }

export function TemplateCatalogue({
  today,
  templates,
}: {
  today: TodayPayload
  templates: ProgramTemplateSummary[]
}) {
  const router = useRouter()
  const builderTitleId = useId()
  const [filter, setFilter] = useState('All')
  const [query, setQuery] = useState('')
  const [showBuilder, setShowBuilder] = useState(false)
  const [showFinder, setShowFinder] = useState(false)
  const activeTemplateId = today.activeProgram?.templateId ?? null
  const overviewQuery = useQuery({
    ...programOverviewQueryOptions(),
    enabled: Boolean(activeTemplateId),
  })

  // Open Find-my-plan once when arriving from the onboarding checklist (`?find=1`), then strip
  // the param so a refresh/back won't re-pop it. Done in an effect (not a state initializer)
  // because the router search isn't reliably readable during the hydration render.
  const findParam = useRouterState({ select: (state) => (state.location.search as { find?: boolean }).find })
  const findHandled = useRef(false)
  useEffect(() => {
    if (findHandled.current || findParam !== true) return
    findHandled.current = true
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time sync from URL param to modal
    setShowFinder(true)
    track('onboarding_deeplink', { target: 'find-my-plan' })
    void router.navigate({ to: '/templates', search: {}, replace: true })
  }, [findParam, router])

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
  const activeTemplate = activeTemplateId ? templates.find((template) => template.id === activeTemplateId) ?? null : null
  const availableTemplates = activeTemplateId
    ? filtered.filter((template) => template.id !== activeTemplateId)
    : filtered
  const builtInTemplates = availableTemplates
    .filter((template) => template.origin !== 'user_created')
    .sort((left, right) => (COMPLEXITY_ORDER[left.complexity] ?? 1) - (COMPLEXITY_ORDER[right.complexity] ?? 1))
  const customTemplates = availableTemplates.filter((template) => template.origin === 'user_created')

  const selectTemplate = (template: ProgramTemplateSummary) => {
    void router.navigate({ to: '/templates/$templateId/start', params: { templateId: template.id } })
  }

  const handleCustomTemplateCreated = async (template: ProgramTemplateSummary) => {
    notifications.show({ color: 'success', title: 'Programme created', message: `${template.name} is ready to start.` })
    setShowBuilder(false)
    await router.invalidate()
    await router.options.context.queryClient.invalidateQueries({ queryKey: ['templates'] })
    await router.navigate({ to: '/templates/$templateId/start', params: { templateId: template.id } })
  }

  return (
    <Page className="max-w-[1180px] md:px-8 lg:px-10">
      <PageHeader
        title="Choose a plan"
        actions={
          <div className="flex w-full items-center justify-between gap-2 sm:w-auto sm:flex-wrap sm:justify-end">
            <Badge color="neutral" variant="light">{templates.length} plans available</Badge>
            <Button
              className="h-8 min-h-8 px-3 sm:hidden"
              hiddenFrom="sm"
              onClick={() => setShowBuilder(true)}
            >
              <Plus size={14} />
              Create
            </Button>
            <Button visibleFrom="sm" onClick={() => setShowBuilder(true)}>
              <Plus size={16} />
              Create programme
            </Button>
          </div>
        }
      >
        Select a structured plan to start your next training cycle.
      </PageHeader>

      {activeTemplate ? (
        <ActiveProgramBand
          template={activeTemplate}
          position={overviewQuery.data?.position ?? null}
          className="mb-4"
          onResume={() => router.navigate({ to: '/today' })}
          onView={() => router.navigate({ to: '/templates/$templateId/start', params: { templateId: activeTemplate.id } })}
        />
      ) : null}

      <Panel className="mb-4 max-w-4xl" p="sm" style={{ borderColor: 'var(--vf-action-border)' }}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
              style={{ backgroundColor: 'var(--vf-action-soft)', border: '1px solid var(--vf-action-border)' }}
            >
              <Sparkles size={18} color="var(--vf-action-text)" />
            </div>
            <div className="min-w-0">
              <Text fw={800} size="sm">Not sure where to start?</Text>
              <Caption>Answer three quick questions and we&apos;ll pick a plan for you.</Caption>
            </div>
          </div>
          <Button className="shrink-0" onClick={() => setShowFinder(true)}>
            <Sparkles size={15} />
            Find my plan
          </Button>
        </div>
      </Panel>

      <div
        className="sticky top-16 z-30 -mx-4 mb-5 space-y-3 px-4 py-3 md:-mx-8 md:px-8 md:mb-6 lg:-mx-10 lg:px-10"
        style={{ backgroundColor: 'var(--mantine-color-body)' }}
      >
        <div className="max-w-4xl">
          <TextInput
            leftSection={<Search size={16} />}
            placeholder="Search programs"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar sm:flex-wrap sm:overflow-visible sm:pb-0">
          {templateFilters.map((item) => (
            <Button
              key={item}
              size="xs"
              radius="xl"
              variant={filter === item ? 'filled' : 'default'}
              className="shrink-0"
              onClick={() => setFilter(item)}
            >
              {item}
            </Button>
          ))}
        </div>
      </div>

      <Panel surface="inset" className="mb-4 max-w-4xl" px="sm" py="xs">
        <Caption>
          Built-in programs are original Sheetless programming tools and are not official, affiliated, or endorsed
          templates from any coach, author, book, or program.
        </Caption>
      </Panel>

      <div className="space-y-6">
        {builtInTemplates.length ? (
          <section>
            <TemplateSectionHeader
              icon={Layers3}
              label="Sheetless library"
              count={builtInTemplates.length}
              helper="Original presets and progression tools."
            />
            <TemplateGrid>
              {builtInTemplates.map((template) => (
                <TemplateCard key={template.id} template={template} onStart={() => selectTemplate(template)} />
              ))}
            </TemplateGrid>
          </section>
        ) : null}

        {customTemplates.length || filter === 'Custom' ? (
          <section>
            <TemplateSectionHeader
              icon={Wrench}
              label="Custom"
              count={customTemplates.length}
              helper="Templates you build for your own training."
            />
            {customTemplates.length ? (
              <TemplateGrid>
                {customTemplates.map((template) => (
                  <TemplateCard key={template.id} template={template} onStart={() => selectTemplate(template)} />
                ))}
              </TemplateGrid>
            ) : (
              <EmptyState title="No matching custom programs">Adjust the search or create a programme.</EmptyState>
            )}
          </section>
        ) : null}

        {!availableTemplates.length && filter !== 'Custom' ? (
          <EmptyState title={activeTemplate ? 'No other matching programs' : 'No matching programs'}>
            Adjust the search or filter to see more templates.
          </EmptyState>
        ) : null}
      </div>

      <Modal
        opened={showBuilder}
        onClose={() => setShowBuilder(false)}
        withCloseButton={false}
        centered
        size="64rem"
        padding={0}
        classNames={{
          inner: 'p-0 sm:p-4',
          content: 'h-[100dvh] max-h-[100dvh] w-full rounded-none sm:h-auto sm:max-h-[92dvh] sm:rounded-lg',
          body: 'h-full',
        }}
        styles={{
          content: {
            backgroundColor: 'transparent',
            border: 0,
            boxShadow: 'none',
          },
          body: {
            padding: 0,
          },
        }}
      >
        <CustomProgramBuilder
          titleId={builderTitleId}
          onClose={() => setShowBuilder(false)}
          onCreated={handleCustomTemplateCreated}
        />
      </Modal>

      <FindMyPlanModal
        opened={showFinder}
        onClose={() => setShowFinder(false)}
        templates={templates.filter((template) => template.origin !== 'user_created')}
        showBrowseAll
        onStart={(templateId) => {
          setShowFinder(false)
          void router.navigate({ to: '/templates/$templateId/start', params: { templateId } })
        }}
      />
    </Page>
  )
}

function TemplateSectionHeader({
  icon: Icon,
  label,
  count,
  helper,
}: {
  icon: LucideIcon
  label: string
  count: number
  helper: string
}) {
  return (
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
      <div className="flex min-w-0 items-center gap-3">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
          style={{ backgroundColor: 'var(--vf-action-soft)', border: '1px solid var(--vf-action-border)' }}
        >
          <Icon size={20} color="var(--vf-action-text)" />
        </div>
        <div className="min-w-0">
          <SectionLabel>{label}</SectionLabel>
          <Caption mt={2}>{helper}</Caption>
        </div>
      </div>
      <Badge color="neutral" variant="light">{count} matching</Badge>
    </div>
  )
}

function ActiveProgramBand({
  template,
  position,
  className,
  onResume,
  onView,
}: {
  template: ProgramTemplateSummary
  position: ProgramOverview['position']
  className?: string
  onResume: () => void
  onView: () => void
}) {
  // Week-based progress (matches "Week X of Y"); position.progressPercent is a session metric
  // that can exceed 100% for short repeating templates, so it's not used for the bar.
  const percent =
    position && position.totalWeeks > 0
      ? Math.min(100, Math.max(0, Math.round((position.weekNumber / position.totalWeeks) * 100)))
      : null
  const showProgress = position != null && percent != null
  return (
    <Panel
      className={`relative overflow-hidden ${className ?? ''}`}
      p="md"
      style={{ borderColor: 'var(--vf-action-border)' }}
    >
      <div className="vf-radial-glow absolute inset-0" aria-hidden />
      <div className="relative grid gap-4 lg:grid-cols-[minmax(0,1fr)_15rem] lg:items-center">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <Badge color="action" variant="filled">Active program</Badge>
            <Badge color={template.origin === 'user_created' ? 'accent' : 'neutral'} variant="light">
              {template.sourceLabel}
            </Badge>
          </div>
          <Heading order={2} size="h3" className="truncate">
            {template.name}
          </Heading>
          <Text mt={3} size="sm" tone="dimmed" lineClamp={2}>
            {template.description}
          </Text>
          {showProgress ? (
            <div className="mt-4">
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <Caption fw={700}>
                  Week {position.weekNumber} of {position.totalWeeks} · {position.phaseLabel}
                </Caption>
                <Caption fw={800} tone="action">{percent}%</Caption>
              </div>
              <div className="h-2 overflow-hidden rounded-full" style={{ backgroundColor: 'var(--vf-surface-3)' }}>
                <div
                  className="h-full rounded-full transition-[width] duration-300"
                  style={{ width: `${percent}%`, backgroundColor: 'var(--vf-action-text)' }}
                />
              </div>
            </div>
          ) : null}
        </div>
        <div className="grid gap-2">
          <div className="grid grid-cols-2 gap-2">
            <ActiveBandMetric label="Days" value={`${template.daysPerWeek}/wk`} />
            <ActiveBandMetric label="Level" value={template.complexity} valueColor={complexityColor(template.complexity)} />
          </div>
          <Button onClick={onResume}>
            <RotateCcw size={16} />
            Resume training
          </Button>
          <Button variant="default" onClick={onView}>
            <Eye size={16} />
            View plan
          </Button>
        </div>
      </div>
    </Panel>
  )
}

function ActiveBandMetric({ label, value, valueColor }: { label: string; value: string | number; valueColor?: string }) {
  return (
    <Panel surface="inset" px="xs" py={6} className="min-w-0">
      <SectionLabel size="0.5625rem" truncate>{label}</SectionLabel>
      <Text mt={2} size="xs" fw={900} truncate c={valueColor}>{value}</Text>
    </Panel>
  )
}
