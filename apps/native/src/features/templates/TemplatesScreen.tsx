import { useState } from 'react'
import { View } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { router, useIsFocused } from 'expo-router'
import type { User } from '@supabase/supabase-js'
import { DEFAULT_CATALOGUE_BROWSE_FILTERS, browseCatalogueItems } from '@sheetless/domain/program/catalogue-browsing'
import { buildCatalogueItems } from '@sheetless/domain/program/template-families'
import { Button, Caption, EmptyState, Heading, Panel, SectionLabel, Text } from '@/components'
import { programOverviewQueryOptions } from '@/features/program/queries'
import { useSession } from '@/lib/session-provider'
import { spacing } from '@/lib/tokens'
import { ActiveProgramBand } from './catalogue/ActiveProgramBand'
import { FavoriteWorkoutsSection } from './favorites/FavoriteWorkoutsSection'
import { TemplateCatalogueFilters } from './catalogue/TemplateCatalogueFilters'
import { TemplateFilterSheet } from './catalogue/TemplateFilterSheet'
import { TemplateCard } from './catalogue/TemplateCard'
import { TemplateFinderPrompt } from './catalogue/TemplateFinderPrompt'
import { TemplatesLayout } from './catalogue/TemplatesLayout'
import { templatesQueryOptions } from './queries'

export function TemplatesScreen() {
  const { user } = useSession()
  return user ? <Library key={user.id} user={user} /> : null
}

function Library({ user }: { user: User }) {
  const focused = useIsFocused()
  const [filters, setFilters] = useState(DEFAULT_CATALOGUE_BROWSE_FILTERS)
  const [filterOpen, setFilterOpen] = useState(false)
  const templates = useQuery(templatesQueryOptions(user))
  const overview = useQuery(programOverviewQueryOptions(user))
  const items = buildCatalogueItems(templates.data ?? [])
  const builtIn = items.filter(item => item.kind === 'family' || item.template.origin !== 'user_created')
  const custom = items.filter(item => item.kind === 'single' && item.template.origin === 'user_created')
  const visibleBuiltIn = browseCatalogueItems(builtIn, filters)
  const visibleCustom = browseCatalogueItems(custom, filters)
  const visibleCount = visibleBuiltIn.length + visibleCustom.length
  const schedules = builtIn.reduce((sum, item) => sum + (item.kind === 'family' ? item.members.length : 1), 0)
  const filtersActive = filters.query.trim() !== '' || filters.days !== 'all' || filters.level !== 'All' || filters.goal !== 'all'
  const active = overview.data?.activeProgram
  const openTemplate = (templateId: string) => router.push({ pathname: '/template/[templateId]', params: { templateId } })

  return <TemplatesLayout>
    <View style={{ gap: 2 }}>
      <Heading order={1}>Plans</Heading>
      {templates.data ? <Caption>{builtIn.length} built-in {builtIn.length === 1 ? 'plan' : 'plans'} · {schedules} {schedules === 1 ? 'schedule' : 'schedules'}.</Caption> : null}
    </View>
    {overview.isError ? <Panel surface="inset" style={{ padding: spacing.sm, gap: spacing.xs }}>
      <Caption tone="warning">Your current plan could not load. You can still browse.</Caption>
      <Button label="Retry current plan" variant="subtle" loading={overview.isFetching} onPress={() => void overview.refetch()} />
    </Panel> : active ? <ActiveProgramBand name={active.title} position={overview.data?.position}
      onOpen={() => router.dismissTo('/(tabs)/program')} /> : null}
    <TemplateFinderPrompt onOpen={() => router.push('/templates/find')} />
    {templates.isPending ? <Text tone="dimmed">Loading plans…</Text> : templates.isError ? <>
      <EmptyState title="Plans could not load">{templates.error.message}</EmptyState>
      <Button label="Retry" variant="default" loading={templates.isFetching} onPress={() => void templates.refetch()} />
    </> : <>
      <TemplateCatalogueFilters filters={filters} onChange={setFilters} onOpen={() => setFilterOpen(true)} />
      {filtersActive ? <View style={{ gap: spacing.xs }}>
        <Caption>{visibleCount} {visibleCount === 1 ? 'plan matches' : 'plans match'}</Caption>
        <Button label="Clear search and filters" variant="subtle" onPress={() => setFilters(DEFAULT_CATALOGUE_BROWSE_FILTERS)} />
      </View> : null}
      {visibleBuiltIn.map(item => <TemplateCard key={item.kind === 'family' ? item.family.id : item.template.id}
        item={item} filters={filters} onOpen={openTemplate} />)}
      {visibleCustom.length ? <SectionLabel>Your custom plans</SectionLabel> : null}
      {visibleCustom.map(item => <TemplateCard key={item.kind === 'family' ? item.family.id : item.template.id}
        item={item} filters={filters} onOpen={openTemplate} />)}
      {!visibleCount ? <EmptyState title={filtersActive ? 'Nothing matches' : 'No plans available'}
        action={filtersActive ? <Button label="Clear filters" onPress={() => setFilters(DEFAULT_CATALOGUE_BROWSE_FILTERS)} />
          : <Button label="Refresh catalogue" variant="default" loading={templates.isFetching} onPress={() => void templates.refetch()} />}>
        {filtersActive ? 'Try another search or change the days, level or goal.' : 'Try refreshing the catalogue.'}
      </EmptyState> : null}
      <Caption>Every built-in plan is original Sheetless programming, not an official or affiliated version of a published template.</Caption>
      {filterOpen && focused ? <TemplateFilterSheet items={items} filters={filters} onClose={() => setFilterOpen(false)}
        onApply={next => { setFilters(next); setFilterOpen(false) }} /> : null}
    </>}
    <FavoriteWorkoutsSection user={user} />
  </TemplatesLayout>
}
