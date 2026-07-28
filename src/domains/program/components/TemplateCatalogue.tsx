import { Badge, Button } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { useQuery } from '@tanstack/react-query'
import { useRouter, useRouterState } from '@tanstack/react-router'
import { Layers3, Plus, Star, Wrench } from 'lucide-react'
import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { track } from '~/shared/lib/analytics'
import { Caption, EmptyState, Page, PageHeader, Panel } from '~/components'
import { useRequiredAccountId } from '~/domains/account/components/AccountIdentityProvider'
import { FavoriteWorkoutCard } from '~/domains/session/components/FavoriteWorkoutCard'
import { favoriteWorkoutsQueryOptions } from '~/domains/session/queries'
import { programOverviewQueryOptions } from '~/domains/program/queries'
import type { ProgramTemplateSummary } from '~/domains/program'
import type { TodayPayload } from '~/domains/session'
import { buildCatalogueItems, type CatalogueItem } from '~/domains/program/lib/template-families'
import { GOAL_OPTIONS } from '~/domains/program/lib/recommend-plan'
import { FindMyPlanModal } from './FindMyPlanModal'
import { TemplateCard, TemplateGrid } from './TemplateCard'
import { accountQueryKeys } from '~/shared/lib/query-keys'
import { TemplateCatalogueBuilderModal } from './TemplateCatalogueBuilderModal'
import { TemplateCatalogueFilters } from './TemplateCatalogueFilters'
import {
  ActiveProgramBand,
  TemplateFinderPrompt,
  TemplateSectionHeader,
} from './TemplateCataloguePresentation'

// Surface the most approachable plans first.
const COMPLEXITY_ORDER: Record<string, number> = { Beginner: 0, Intermediate: 1, Advanced: 2 }

export function TemplateCatalogue({
  today,
  templates,
}: {
  today: TodayPayload
  templates: ProgramTemplateSummary[]
}) {
  const userId = useRequiredAccountId()
  const router = useRouter()
  const builderTitleId = useId()
  const [levelFilter, setLevelFilter] = useState<string>('All')
  const [goalFilter, setGoalFilter] = useState<string>('all')
  const [query, setQuery] = useState('')
  const [showBuilder, setShowBuilder] = useState(false)
  const [showFinder, setShowFinder] = useState(false)
  const activeTemplateId = today.activeProgram?.templateId ?? null
  const overviewQuery = useQuery({
    ...programOverviewQueryOptions(userId),
    enabled: Boolean(activeTemplateId),
  })
  const favoritesQuery = useQuery(favoriteWorkoutsQueryOptions(userId))
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
    await router.options.context.queryClient.invalidateQueries({
      queryKey: accountQueryKeys.templatesRoot(userId),
    })
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

      <TemplateFinderPrompt onOpen={() => setShowFinder(true)} />
      <TemplateCatalogueFilters
        level={levelFilter}
        goal={goalFilter}
        query={query}
        onLevelChange={setLevelFilter}
        onGoalChange={setGoalFilter}
        onQueryChange={setQuery}
      />

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

      <TemplateCatalogueBuilderModal
        opened={showBuilder}
        titleId={builderTitleId}
        onClose={() => setShowBuilder(false)}
        onCreated={handleCustomTemplateCreated}
      />

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
