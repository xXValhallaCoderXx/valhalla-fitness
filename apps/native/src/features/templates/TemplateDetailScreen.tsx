import { useMemo, useState } from 'react'
import { Linking, ScrollView } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { router } from 'expo-router'
import type { User } from '@supabase/supabase-js'
import type { UserProfile } from '@sheetless/domain/account/types'
import { familyMembersForTemplate } from '@sheetless/domain/program/template-families'
import { deriveTemplatePhases } from '@sheetless/domain/program/template-start-phases'
import type { ProgramSetupOptions, ProgramTemplateSummary } from '@sheetless/domain/program/types'
import type { TodayPayload } from '@sheetless/domain/session/types'
import { Button, EmptyState, PageHeader, Panel, Screen, Text } from '@/components'
import { todayQueryOptions } from '@/features/session/queries'
import { useMe } from '@/lib/account'
import { useSession } from '@/lib/session-provider'
import { spacing } from '@/lib/tokens'
import { ProgramStartCard } from './ProgramStartCard'
import { ProgramVariantSelector } from './ProgramVariantSelector'
import { PreviewWeek, TemplateFacts } from './TemplateDetails'
import { templateSetupQueryOptions, templatesQueryOptions } from './queries'

const WEB_TEMPLATE_BASE = 'https://www.sheetless.fitness/templates'

export function TemplateDetailScreen({ templateId }: { templateId: string }) {
  const { user } = useSession()
  const profile = useMe()
  const templates = useQuery({ ...templatesQueryOptions(user!), enabled: Boolean(user) })
  const template = templates.data?.find((item) => item.id === templateId)
  const setup = useQuery({
    ...templateSetupQueryOptions(user!, templateId),
    enabled: Boolean(user && template),
  })
  const today = useQuery({
    ...todayQueryOptions(user!, profile.data?.timezone ?? undefined),
    enabled: Boolean(user && profile.data),
  })

  if (
    templates.isPending ||
    profile.isPending ||
    today.isPending ||
    (template && setup.isPending)
  ) {
    return (
      <Screen>
        <PageHeader title={template?.name ?? 'Programme'} />
        <Panel style={{ padding: spacing.md }}>
          <Text tone="dimmed">Loading programme setup…</Text>
        </Panel>
      </Screen>
    )
  }

  if (templates.isError || profile.isError || today.isError || setup.isError) {
    const error = templates.error ?? profile.error ?? today.error ?? setup.error
    return (
      <Screen>
        <PageHeader title="Programme" />
        <EmptyState title="Programme could not load">
          {error instanceof Error ? error.message : 'Try again in a moment.'}
        </EmptyState>
      </Screen>
    )
  }

  if (!user || !template || !setup.data || !profile.data || !today.data) {
    return (
      <Screen>
        <PageHeader title="Programme" />
        <EmptyState title="Programme not found">This programme is no longer available.</EmptyState>
      </Screen>
    )
  }

  const familyMembers = familyMembersForTemplate(templateId, templates.data)
  return (
    <TemplateDetailContent
      key={templateId}
      user={user}
      profile={profile.data}
      today={today.data}
      template={template}
      setup={setup.data}
      familyMembers={familyMembers}
    />
  )
}

function TemplateDetailContent({
  user,
  profile,
  today,
  template,
  setup,
  familyMembers,
}: {
  user: User
  profile: UserProfile
  today: TodayPayload
  template: ProgramTemplateSummary
  setup: ProgramSetupOptions
  familyMembers: ProgramTemplateSummary[]
}) {
  const [weekIndex, setWeekIndex] = useState(0)
  const phases = useMemo(() => deriveTemplatePhases(setup.previewWeeks), [setup.previewWeeks])
  const selectedWeek = setup.previewWeeks.find((week) => week.index === weekIndex) ?? setup.previewWeeks[0]

  return (
    <Screen>
      <PageHeader
        title={template.name}
        eyebrow={template.sourceLabel}
        subtitle={template.description}
      />
      <ProgramVariantSelector
        members={familyMembers}
        selectedTemplateId={template.id}
        onSelect={(nextTemplateId) =>
          router.replace({ pathname: '/template/[templateId]', params: { templateId: nextTemplateId } })
        }
      />
      <TemplateFacts template={template} setup={setup} phases={phases} />
      <ProgramStartCard user={user} profile={profile} today={today} template={template} />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: spacing.xs }}
      >
        {setup.previewWeeks.map((week) => (
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
        <Text size="sm" weight={800}>Need advanced setup?</Text>
        <Text size="sm" tone="dimmed">
          Movement substitutions, added accessories, and free-weight conversion remain on the web for now.
        </Text>
        <Button
          label="Advanced setup on sheetless.fitness"
          variant="default"
          fullWidth
          onPress={() => Linking.openURL(`${WEB_TEMPLATE_BASE}/${template.id}/start`)}
        />
      </Panel>
    </Screen>
  )
}
