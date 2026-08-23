import { View } from 'react-native'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { router } from 'expo-router'
import {
  buildCatalogueItems,
  type CatalogueItem,
} from '@sheetless/domain/program/template-families'
import type { ProgramOverview } from '@sheetless/domain/program/types'
import { getActiveProgram } from '@sheetless/data/program/active-program'
import { accountQueryKeys } from '@sheetless/domain/shared/query-keys'
import { queryStaleTimes } from '@sheetless/domain/shared/query-stale-times'
import { Caption, EmptyState, PageHeader, Panel, Screen, SectionLabel, Text } from '@/components'
import { buildUserContext } from '@/lib/account'
import { useSession } from '@/lib/session-provider'
import { spacing } from '@/lib/tokens'
import { ActiveProgramBand } from './ActiveProgramBand'
import { TemplateCard } from './TemplateCard'
import { templatesQueryOptions } from './queries'

const complexityOrder: Record<string, number> = { Beginner: 0, Intermediate: 1, Advanced: 2 }

export function TemplatesScreen() {
  const { user } = useSession()
  const queryClient = useQueryClient()
  const templates = useQuery({ ...templatesQueryOptions(user!), enabled: Boolean(user) })
  const activeProgram = useQuery({
    queryKey: accountQueryKeys.activeProgram(user!.id),
    queryFn: () => getActiveProgram(buildUserContext(user!)),
    staleTime: queryStaleTimes.program,
    enabled: Boolean(user),
  })

  if (templates.isPending) {
    return (
      <Screen>
        <PageHeader title="Programs" subtitle="Structured plans for your next cycle." />
        <Panel style={{ padding: spacing.md }}><Text tone="dimmed">Loading programmes…</Text></Panel>
      </Screen>
    )
  }
  if (templates.isError) {
    return (
      <Screen>
        <PageHeader title="Programs" />
        <EmptyState title="Programs could not load">
          {templates.error instanceof Error ? templates.error.message : 'Try again in a moment.'}
        </EmptyState>
      </Screen>
    )
  }

  const overview = queryClient.getQueryData<ProgramOverview>(accountQueryKeys.programOverview(user!.id))
  const activeTemplateId = activeProgram.data?.templateId ?? null
  const activeTemplate = activeTemplateId
    ? templates.data.find((template) => template.id === activeTemplateId) ?? null
    : null
  const activePosition = overview && activeProgram.data && overview.activeProgram?.id === activeProgram.data.id
    ? overview.position
    : undefined
  const builtInCount = templates.data.filter((template) => template.origin !== 'user_created').length
  const available = templates.data.filter((template) => template.id !== activeTemplateId)
  const builtIn = available
    .filter((template) => template.origin !== 'user_created')
    .sort((left, right) => (complexityOrder[left.complexity] ?? 1) - (complexityOrder[right.complexity] ?? 1))
  const custom = available.filter((template) => template.origin === 'user_created')
  const builtInItems = buildCatalogueItems(builtIn)
  const customItems = buildCatalogueItems(custom)
  const openTemplate = (templateId: string) =>
    router.push({ pathname: '/template/[templateId]', params: { templateId } })

  return (
    <Screen>
      <PageHeader title="Programs" eyebrow="Choose a plan" subtitle="Structured plans for your next cycle." />
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
      <Panel surface="inset" style={{ padding: spacing.sm }}>
        <Caption>
          Built-in programs are original Sheetless programming tools and are not official or affiliated templates.
        </Caption>
      </Panel>
      <TemplateSection
        title="Sheetless library"
        items={builtInItems}
        planCount={builtInCount}
        onOpen={openTemplate}
      />
      {customItems.length ? <TemplateSection title="Custom" items={customItems} onOpen={openTemplate} /> : null}
      {!builtInItems.length && !customItems.length ? (
        <EmptyState title="No programs available">Check back after the catalogue refreshes.</EmptyState>
      ) : null}
    </Screen>
  )
}

function TemplateSection({
  title,
  items,
  planCount,
  onOpen,
}: {
  title: string
  items: CatalogueItem[]
  planCount?: number
  onOpen: (templateId: string) => void
}) {
  if (!items.length) return null
  const count = planCount ?? items.length
  return (
    <View style={{ gap: spacing.sm }}>
      <View style={{ alignItems: 'center', flexDirection: 'row', gap: spacing.sm, justifyContent: 'space-between' }}>
        <SectionLabel>{title}</SectionLabel>
        <Caption>{count} {count === 1 ? 'plan' : 'plans'}</Caption>
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
