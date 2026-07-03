import { Badge, Button, Modal, TextInput } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { useQuery } from '@tanstack/react-query'
import { useRouter, useRouterState } from '@tanstack/react-router'
import { Eye, Layers3, Plus, RotateCcw, Search, Sparkles, Star, Wrench, type LucideIcon } from 'lucide-react'
import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react'
import { track } from '~/shared/lib/analytics'
import { Caption, EmptyState, Heading, Page, PageHeader, Panel, SectionLabel, Text } from '~/components'
import { FavoriteWorkoutCard } from '~/domains/session/components/FavoriteWorkoutCard'
import { favoriteWorkoutsQueryOptions } from '~/domains/session/queries'
import { programOverviewQueryOptions } from '~/domains/program/queries'
import type { ProgramOverview, ProgramTemplateSummary, TodayPayload } from '~/shared/types'
import { buildCatalogueItems, type CatalogueItem } from '~/domains/program/lib/template-families'
import { GOAL_OPTIONS } from '~/domains/program/lib/recommend-plan'
import { CustomProgramBuilder } from './CustomProgramBuilder'
import { FindMyPlanModal } from './FindMyPlanModal'
import { complexityColor, TemplateCard, TemplateGrid } from './TemplateCard'

// Two friendly filter axes replace the old methodology chips: pick a level and/or a goal.
const LEVEL_FILTERS = ['All', 'Beginner', 'Intermediate', 'Advanced'] as const
const GOAL_FILTERS: { value: string; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'simple', label: 'Simple' },
  { value: 'strength', label: 'Strength' },
  { value: 'muscle', label: 'Muscle' },
]

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
  const [levelFilter, setLevelFilter] = useState<string>('All')
  const [goalFilter, setGoalFilter] = useState<string>('all')
  const [query, setQuery] = useState('')
  const [showBuilder, setShowBuilder] = useState(false)
  const [showFinder, setShowFinder] = useState(false)
  const activeTemplateId = today.activeProgram?.templateId ?? null
  const overviewQuery = useQuery({
    ...programOverviewQueryOptions(),
    enabled: Boolean(activeTemplateId),
  })
  const favoritesQuery = useQuery(favoriteWorkoutsQueryOptions())
  const favoriteWorkouts = favoritesQuery.data ?? []

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

  const activeTemplate = activeTemplateId ? templates.find((template) => template.id === activeTemplateId) ?? null : null
  const availableTemplates = activeTemplateId
    ? templates.filter((template) => template.id !== activeTemplateId)
    : templates
  const builtInAvailable = availableTemplates
    .filter((template) => template.origin !== 'user_created')
    .sort((left, right) => (COMPLEXITY_ORDER[left.complexity] ?? 1) - (COMPLEXITY_ORDER[right.complexity] ?? 1))
  const customAvailable = availableTemplates.filter((template) => template.origin === 'user_created')

  // Group into family cards first, THEN filter — so a family stays whole and shows when ANY of its
  // variants fits the chosen level/goal, instead of fragmenting into partial cards.
  const goalTags = useMemo(
    () => GOAL_OPTIONS.find((goal) => goal.value === goalFilter)?.tags.map((tag) => tag.toLowerCase()) ?? [],
    [goalFilter],
  )
  const matchesItem = useMemo(() => {
    const q = query.trim().toLowerCase()
    const memberMatches = (member: ProgramTemplateSummary) => {
      const levelOk = levelFilter === 'All' || member.complexity === levelFilter
      const goalOk = goalFilter === 'all' || member.tags.some((tag) => goalTags.includes(tag.toLowerCase()))
      return levelOk && goalOk
    }
    return (item: CatalogueItem) => {
      const members = item.kind === 'family' ? item.members : [item.template]
      const familyText = item.kind === 'family' ? `${item.family.name} ${item.family.tagline ?? ''}` : ''
      const haystack =
        `${familyText} ${members.map((m) => `${m.name} ${m.description} ${m.tags.join(' ')}`).join(' ')}`.toLowerCase()
      return members.some(memberMatches) && haystack.includes(q)
    }
  }, [levelFilter, goalFilter, goalTags, query])

  const builtInItems = buildCatalogueItems(builtInAvailable).filter(matchesItem)
  const customItems = buildCatalogueItems(customAvailable).filter(matchesItem)
  // Header badge counts the whole library (collapsed cards), independent of the active filters.
  const catalogueCount = buildCatalogueItems(templates).length

  const selectTemplateId = (templateId: string) => {
    void router.navigate({ to: '/templates/$templateId/start', params: { templateId } })
  }
  const selectTemplate = (template: ProgramTemplateSummary) => selectTemplateId(template.id)

  const renderItem = (item: CatalogueItem) =>
    item.kind === 'family' ? (
      <TemplateCard
        key={item.family.id}
        template={item.members[0]}
        family={item.family}
        members={item.members}
        // Open the variant the card represents (its first present member), not the static default —
        // which could be filtered out or the active programme, and so not among the shown members.
        onStart={() => selectTemplateId(item.members[0].id)}
      />
    ) : (
      <TemplateCard key={item.template.id} template={item.template} onStart={() => selectTemplate(item.template)} />
    )

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
            <Badge color="neutral" variant="light">{catalogueCount} plans available</Badge>
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
        className="sticky top-0 z-30 -mx-3 mb-5 space-y-3 px-3 py-3 md:-mx-8 md:px-8 md:mb-6 lg:-mx-10 lg:px-10"
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
        <div className="space-y-2">
          <FilterRow label="Level">
            {LEVEL_FILTERS.map((level) => (
              <Button
                key={level}
                size="xs"
                radius="xl"
                variant={levelFilter === level ? 'filled' : 'default'}
                className="shrink-0"
                onClick={() => setLevelFilter(level)}
              >
                {level}
              </Button>
            ))}
          </FilterRow>
          <FilterRow label="Goal">
            {GOAL_FILTERS.map((goal) => (
              <Button
                key={goal.value}
                size="xs"
                radius="xl"
                variant={goalFilter === goal.value ? 'filled' : 'default'}
                className="shrink-0"
                onClick={() => setGoalFilter(goal.value)}
              >
                {goal.label}
              </Button>
            ))}
          </FilterRow>
        </div>
      </div>

      <Panel surface="inset" className="mb-4 max-w-4xl" px="sm" py="xs">
        <Caption>
          Built-in programs are original Sheetless programming tools and are not official, affiliated, or endorsed
          templates from any coach, author, book, or program.
        </Caption>
      </Panel>

      <div className="space-y-6">
        {favoriteWorkouts.length ? (
          <section>
            <TemplateSectionHeader
              icon={Star}
              label="Favourite workouts"
              count={favoriteWorkouts.length}
              countLabel="saved"
              helper="One-off workouts you saved from Insights — start a fresh copy any time."
            />
            <TemplateGrid>
              {favoriteWorkouts.map((workout) => (
                <FavoriteWorkoutCard
                  key={workout.sessionId}
                  workout={workout}
                  activeSessionId={today.activeSession?.sessionId ?? null}
                />
              ))}
            </TemplateGrid>
          </section>
        ) : null}

        {builtInItems.length ? (
          <section>
            <TemplateSectionHeader
              icon={Layers3}
              label="Sheetless library"
              count={builtInItems.length}
              helper="Original presets and progression tools."
            />
            <TemplateGrid>{builtInItems.map(renderItem)}</TemplateGrid>
          </section>
        ) : null}

        {customItems.length ? (
          <section>
            <TemplateSectionHeader
              icon={Wrench}
              label="Custom"
              count={customItems.length}
              helper="Templates you build for your own training."
            />
            <TemplateGrid>{customItems.map(renderItem)}</TemplateGrid>
          </section>
        ) : null}

        {!builtInItems.length && !customItems.length ? (
          <EmptyState title={activeTemplate ? 'No other matching programs' : 'No matching programs'}>
            Adjust the search, level, or goal to see more templates.
          </EmptyState>
        ) : null}
      </div>

      <Modal
        opened={showBuilder}
        onClose={() => setShowBuilder(false)}
        withCloseButton={false}
        size="64rem"
        padding={0}
        // Keep the native scrollbar (don't hide it / pad the body) so opening or closing the modal
        // doesn't reflow the centered page behind it — fixes the few-pixel horizontal layout shift.
        removeScrollProps={{ removeScrollBar: false }}
        classNames={{
          // Bottom sheet on mobile (matches the app's other modals): pinned to the bottom, rounded
          // top, flush bottom. Centered card on desktop. items-end (not stretch) keeps the sheet
          // anchored to the bottom so a keyboard overlay can't re-center it.
          inner: '!items-end !p-0 sm:!items-center sm:!p-4',
          content: '!mb-0 max-h-[92dvh] w-full rounded-t-2xl rounded-b-none sm:max-h-[92dvh] sm:rounded-lg',
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

function FilterRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <div className="w-12 shrink-0">
        <SectionLabel size="0.625rem">{label}</SectionLabel>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar sm:flex-wrap sm:overflow-visible sm:pb-0">
        {children}
      </div>
    </div>
  )
}

function TemplateSectionHeader({
  icon: Icon,
  label,
  count,
  countLabel = 'matching',
  helper,
}: {
  icon: LucideIcon
  label: string
  count: number
  countLabel?: string
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
      <Badge color="neutral" variant="light">{count} {countLabel}</Badge>
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
