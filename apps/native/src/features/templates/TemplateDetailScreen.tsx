import { useMemo, useState } from 'react'
import { Linking, ScrollView, View } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { deriveTemplatePhases } from '@sheetless/domain/program/template-start-phases'
import { Button, EmptyState, PageHeader, Panel, Screen, Text } from '@/components'
import { useSession } from '@/lib/session-provider'
import { spacing } from '@/lib/tokens'
import { PreviewWeek, TemplateFacts } from './TemplateDetails'
import { templateSetupQueryOptions, templatesQueryOptions } from './queries'

const WEB_TEMPLATE_BASE = 'https://www.sheetless.fitness/templates'

export function TemplateDetailScreen({ templateId }: { templateId: string }) {
  const { user } = useSession()
  const [weekIndex, setWeekIndex] = useState(0)
  const templates = useQuery({ ...templatesQueryOptions(user!), enabled: Boolean(user) })
  const template = templates.data?.find((item) => item.id === templateId)
  const setup = useQuery({
    ...templateSetupQueryOptions(user!, templateId),
    enabled: Boolean(user && template),
  })
  const phases = useMemo(
    () => deriveTemplatePhases(setup.data?.previewWeeks ?? []),
    [setup.data?.previewWeeks],
  )

  if (templates.isPending || (template && setup.isPending)) {
    return (
      <Screen>
        <PageHeader title={template?.name ?? 'Programme'} />
        <Panel style={{ padding: spacing.md }}><Text tone="dimmed">Loading programme preview…</Text></Panel>
      </Screen>
    )
  }
  if (templates.isError || setup.isError) {
    const error = templates.error ?? setup.error
    return (
      <Screen>
        <PageHeader title="Programme" />
        <EmptyState title="Programme could not load">
          {error instanceof Error ? error.message : 'Try again in a moment.'}
        </EmptyState>
      </Screen>
    )
  }
  if (!template || !setup.data) {
    return (
      <Screen>
        <PageHeader title="Programme" />
        <EmptyState title="Programme not found">This programme is no longer available.</EmptyState>
      </Screen>
    )
  }

  const selectedWeek = setup.data.previewWeeks.find((week) => week.index === weekIndex) ?? setup.data.previewWeeks[0]
  return (
    <Screen>
      <PageHeader
        title={template.name}
        eyebrow={template.sourceLabel}
        subtitle={template.description}
      />
      <TemplateFacts template={template} setup={setup.data} phases={phases} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.xs }}>
        {setup.data.previewWeeks.map((week) => (
          <Button
            key={week.index}
            label={week.label}
            variant={selectedWeek?.index === week.index ? 'filled' : 'default'}
            onPress={() => setWeekIndex(week.index)}
          />
        ))}
      </ScrollView>
      {selectedWeek ? <PreviewWeek week={selectedWeek} /> : null}
      <Panel style={{ gap: spacing.sm, padding: spacing.md }}>
        <Text size="sm" weight={800}>Ready to use this programme?</Text>
        <Text size="sm" tone="dimmed">
          Starting, switching, and customizing programmes stays on sheetless.fitness for now.
        </Text>
        <Button
          label="Manage on sheetless.fitness"
          fullWidth
          onPress={() => Linking.openURL(`${WEB_TEMPLATE_BASE}/${template.id}/start`)}
        />
      </Panel>
    </Screen>
  )
}
