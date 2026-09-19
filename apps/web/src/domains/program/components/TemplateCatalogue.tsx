import { Button } from '@mantine/core'
import { useQuery } from '@tanstack/react-query'
import { useRouter, useRouterState } from '@tanstack/react-router'
import { Compass, Layers3, Plus, Star, Wrench } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import {
  filterCatalogueItems,
  type CatalogueGoalFilter,
  type CatalogueLevelFilter,
} from '@sheetless/domain/program/catalogue-filters'
import { track } from '~/shared/lib/analytics'
import { EmptyState, Page, Panel, ScreenHeader, SectionLabel, Text } from '~/components'
import { useExperienceMode } from '~/domains/account/components'
import { programmeLibraryAbout } from '~/domains/program/lib/setup-labels'
import { useAccountId } from '~/domains/account/components/AccountIdentityProvider'
import { FavoriteWorkoutCard } from '~/domains/session/components/FavoriteWorkoutCard'
import { favoriteWorkoutsQueryOptions } from '~/domains/session/queries'
import { programOverviewQueryOptions } from '~/domains/program/queries'
import type { ProgramTemplateSummary } from '~/domains/program'
import type { TodayPayload } from '~/domains/session'
import { buildCatalogueItems, type CatalogueItem } from '~/domains/program/lib/template-families'
import { FindMyPlanModal } from './FindMyPlanModal'
import { TemplateCard, TemplateGrid } from './TemplateCard'
import { TemplateCatalogueFilters } from './TemplateCatalogueFilters'
import { ActiveProgramBand, TemplateSectionHeader } from './TemplateCataloguePresentation'

// Surface the most approachable plans first.
const COMPLEXITY_ORDER: Record<string, number> = { Beginner: 0, Intermediate: 1, Advanced: 2 }

export function TemplateCatalogue({
  today,
  templates,
}: {
  /** Absent when signed out — the library is public, only starting one needs an account. */
  today?: TodayPayload
  templates: ProgramTemplateSummary[]
}) {
  const userId = useAccountId()
  const router = useRouter()
  const [levelFilter, setLevelFilter] = useState<CatalogueLevelFilter>('All')
  const [goalFilter, setGoalFilter] = useState<CatalogueGoalFilter>('all')
  const [query, setQuery] = useState('')
  const [showFinder, setShowFinder] = useState(false)
  const { mode } = useExperienceMode()
  const activeTemplateId = today?.activeProgram?.templateId ?? null
  const overviewQuery = useQuery({
    ...programOverviewQueryOptions(userId ?? ''),
    enabled: Boolean(userId && activeTemplateId),
  })
  const favoritesQuery = useQuery({
    ...favoriteWorkoutsQueryOptions(userId ?? ''),
    enabled: Boolean(userId),
  })
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

  // Group first so a match keeps every schedule variant visible on its family card.
  const filters = { level: levelFilter, goal: goalFilter, query }
  const builtInItems = filterCatalogueItems(buildCatalogueItems(builtInAvailable), filters)
  const customItems = filterCatalogueItems(buildCatalogueItems(customAvailable), filters)

  const selectTemplateId = (templateId: string) => {
    // Browsing is public; setting one up is not.
    if (!userId) {
      void router.navigate({ to: '/auth' })
      return
    }
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

  return (
    <Page className="max-w-[1180px] md:px-8 lg:px-10">
      <ScreenHeader
        title="Programmes"
        subtitle="Structure for your next training cycle."
        actions={
          <>
            <Button variant="default" onClick={() => setShowFinder(true)}>
              <Compass size={16} />
              Find my plan
            </Button>
            <Button onClick={() => void router.navigate({ to: '/templates/new' })}>
              <Plus size={16} />
              Create programme
            </Button>
          </>
        }
      />

      {activeTemplate ? (
        <ActiveProgramBand
          template={activeTemplate}
          position={overviewQuery.data?.position ?? null}
          className="mb-4"
          // The plan lives at /program; sending "View plan" back into the setup wizard was a
          // long-standing mis-wire.
          onView={() => router.navigate({ to: '/program' })}
        />
      ) : null}

      <TemplateCatalogueFilters
        level={levelFilter}
        goal={goalFilter}
        query={query}
        resultCount={builtInItems.length + customItems.length}
        onLevelChange={setLevelFilter}
        onGoalChange={setGoalFilter}
        onQueryChange={setQuery}
      />

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
                  activeSessionId={today?.activeSession?.sessionId ?? null}
                />
              ))}
            </TemplateGrid>
          </section>
        ) : null}

        {builtInItems.length ? (
          <section>
            {/* The header earns its place only when another section follows it; on its own it
                just repeats the count already sitting in the filter row. */}
            {favoriteWorkouts.length || customItems.length ? (
              <TemplateSectionHeader
                icon={Layers3}
                label="Sheetless library"
                count={builtInItems.length}
                helper="Original presets and progression tools."
              />
            ) : null}
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
          <EmptyState title={activeTemplate ? 'No other matching programmes' : 'No matching programmes'}>
            Adjust the search, level, or goal to see more templates.
          </EmptyState>
        ) : null}

        <Panel p="md">
          <SectionLabel>{programmeLibraryAbout[mode].title}</SectionLabel>
          <Text mt={6} size="sm" tone="dimmed" lh={1.55}>
            {programmeLibraryAbout[mode].body}
          </Text>
          {/* The provenance statement is deliberate, not decoration — the comp has no slot for it,
              so it lives here rather than being dropped. */}
          <Text mt={8} size="xs" tone="dimmed" lh={1.5}>
            Built-in programmes are original Sheetless programming tools and are not official, affiliated,
            or endorsed templates from any coach, author, book, or programme.
          </Text>
        </Panel>
      </div>

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
