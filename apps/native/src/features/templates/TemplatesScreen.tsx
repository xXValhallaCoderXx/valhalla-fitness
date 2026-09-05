import { useState } from 'react'
import { View } from 'react-native'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { router } from 'expo-router'
import {
  DEFAULT_CATALOGUE_FILTERS,
  filterCatalogueItems,
} from '@sheetless/domain/program/catalogue-filters'
import {
  buildCatalogueItems,
  type CatalogueItem,
} from '@sheetless/domain/program/template-families'
import type { ProgramOverview } from '@sheetless/domain/program/types'
import type { TodayPayload } from '@sheetless/domain/session/types/read-models'
import { getActiveProgram } from '@sheetless/data/program/active-program'
import { accountQueryKeys } from '@sheetless/domain/shared/query-keys'
import { queryStaleTimes } from '@sheetless/domain/shared/query-stale-times'
import {
  Caption,
  Button,
  EmptyState,
  PageHeader,
  Panel,
  Screen,
  SectionLabel,
  SettingsHeaderAction,
  Text,
} from '@/components'
import { buildUserContext } from '@/lib/account'
import { useSession } from '@/lib/session-provider'
import { spacing } from '@/lib/tokens'
import { ActiveProgramBand } from './catalogue/ActiveProgramBand'
import { FavoriteWorkoutsSection } from './favorites/FavoriteWorkoutsSection'
import { FindMyPlanSheet } from './find-my-plan/FindMyPlanSheet'
import { TemplateCatalogueFilters } from './catalogue/TemplateCatalogueFilters'
import { TemplateCard } from './catalogue/TemplateCard'
import { TemplateFinderPrompt } from './catalogue/TemplateFinderPrompt'
import { templatesQueryOptions } from './queries'

const complexityOrder: Record<string, number> = { Beginner: 0, Intermediate: 1, Advanced: 2 }

export function TemplatesScreen() {
  const { user } = useSession()
  const queryClient = useQueryClient()
  const [filters, setFilters] = useState(DEFAULT_CATALOGUE_FILTERS)
  const [finderOpen, setFinderOpen] = useState(false)
  const templates = useQuery({ ...templatesQueryOptions(user!), enabled: Boolean(user) })
  const activeProgram = useQuery({
    queryKey: accountQueryKeys.activeProgram(user!.id),
    queryFn: () => getActiveProgram(buildUserContext(user!)),
    staleTime: queryStaleTimes.program,
    enabled: Boolean(user),
  })
  const settingsAction = <SettingsHeaderAction testID="programs-settings" />

  if (templates.isPending) {
    return (
      <Screen>
        <PageHeader title="Programs" subtitle="Structured plans for your next cycle." actions={settingsAction} />
        <Panel style={{ padding: spacing.md }}><Text tone="dimmed">Loading programmes…</Text></Panel>
      </Screen>
    )
  }
  if (templates.isError) {
    return (
      <Screen>
        <PageHeader title="Programs" actions={settingsAction} />
        <EmptyState title="Programs could not load">
          {templates.error instanceof Error ? templates.error.message : 'Try again in a moment.'}
        </EmptyState>
      </Screen>
    )
  }

  const overview = queryClient.getQueryData<ProgramOverview>(accountQueryKeys.programOverview(user!.id))
  const today = queryClient.getQueryData<TodayPayload>(accountQueryKeys.today(user!.id))
  const activeTemplateId = activeProgram.data?.templateId ?? null
  const activeTemplate = activeTemplateId
    ? templates.data.find((template) => template.id === activeTemplateId) ?? null
    : null
  const activePosition = overview && activeProgram.data && overview.activeProgram?.id === activeProgram.data.id
    ? overview.position
    : undefined
  const available = templates.data.filter((template) => template.id !== activeTemplateId)
  const builtIn = available
    .filter((template) => template.origin !== 'user_created')
    .sort((left, right) => (complexityOrder[left.complexity] ?? 1) - (complexityOrder[right.complexity] ?? 1))
  const custom = available.filter((template) => template.origin === 'user_created')
  const builtInItems = filterCatalogueItems(buildCatalogueItems(builtIn), filters)
  const customItems = filterCatalogueItems(buildCatalogueItems(custom), filters)
  const visibleBuiltInPlanCount = builtInItems.reduce(
    (count, item) => count + (item.kind === 'family' ? item.members.length : 1),
    0,
  )
  const filtersActive = filters.query.trim() !== '' || filters.level !== 'All' || filters.goal !== 'all'
  const openTemplate = (templateId: string) =>
    router.push({ pathname: '/template/[templateId]', params: { templateId } })

  return (
    <Screen>
      <PageHeader
        title="Programs"
        eyebrow="Choose a plan"
        subtitle="Structured plans for your next cycle."
        actions={settingsAction}
      />
      {activeTemplate ? (
        <ActiveProgramBand
          template={activeTemplate}
          position={activePosition}
          onOpen={() => openTemplate(activeTemplate.id)}
        />
      ) : null}
      {activeProgram.isError ? (
        <Panel surface="inset" style={{ padding: spacing.sm }}>
          <Caption tone="warning">
            Active programme status could not load. You can still browse the library.
          </Caption>
        </Panel>
      ) : null}
      <TemplateFinderPrompt onOpen={() => setFinderOpen(true)} />
      <TemplateCatalogueFilters filters={filters} onChange={setFilters} />
      <Panel surface="inset" style={{ padding: spacing.sm }}>
        <Caption>
          Built-in programs are original Sheetless programming tools and are not official or affiliated templates.
        </Caption>
      </Panel>
      <FavoriteWorkoutsSection
        user={user!}
        activeSessionId={today?.activeSession?.sessionId ?? null}
      />
      <TemplateSection
        title="Sheetless library"
        items={builtInItems}
        visiblePlanCount={visibleBuiltInPlanCount}
        onOpen={openTemplate}
      />
      {customItems.length ? <TemplateSection title="Custom" items={customItems} onOpen={openTemplate} /> : null}
      {!builtInItems.length && !customItems.length ? (
        <EmptyState
          title={activeTemplate ? 'No other matching programs' : 'No matching programs'}
          action={filtersActive ? (
            <Button
              label="Clear filters"
              variant="default"
              onPress={() => setFilters(DEFAULT_CATALOGUE_FILTERS)}
            />
          ) : undefined}
        >
          {filtersActive
            ? 'Adjust the search, level, or goal to see more templates.'
            : 'Check back after the catalogue refreshes.'}
        </EmptyState>
      ) : null}
      <FindMyPlanSheet
        open={finderOpen}
        user={user!}
        templates={templates.data}
        onClose={() => setFinderOpen(false)}
        onViewTemplate={openTemplate}
      />
    </Screen>
  )
}

function TemplateSection({
  title,
  items,
  visiblePlanCount,
  onOpen,
}: {
  title: string
  items: CatalogueItem[]
  visiblePlanCount?: number
  onOpen: (templateId: string) => void
}) {
  if (!items.length) return null
  return (
    <View style={{ gap: spacing.sm }}>
      <View style={{ alignItems: 'center', flexDirection: 'row', gap: spacing.sm, justifyContent: 'space-between' }}>
        <SectionLabel>{title}</SectionLabel>
        <Caption>
          {visiblePlanCount == null
            ? `${items.length} ${items.length === 1 ? 'plan' : 'plans'}`
            : `${items.length} ${items.length === 1 ? 'card' : 'cards'} · ${visiblePlanCount} ${visiblePlanCount === 1 ? 'plan' : 'plans'}`}
        </Caption>
      </View>
      {items.map((item) => (
        <TemplateCard
          key={item.kind === 'family' ? item.family.id : item.template.id}
          item={item}
          onOpen={onOpen}
        />
      ))}
    </View>
  )
}
