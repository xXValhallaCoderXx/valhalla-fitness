import { useEffect } from 'react'
import { AccessibilityInfo } from 'react-native'
import { router, useIsFocused } from 'expo-router'
import { usePreventRemove } from 'expo-router/react-navigation'
import { useQuery } from '@tanstack/react-query'
import type { User } from '@supabase/supabase-js'
import { FIND_MY_PLAN_QUESTIONS } from '@sheetless/domain/program/recommend-plan'
import { Button, Caption, EmptyState, Panel, Text } from '@/components'
import { useSession } from '@/lib/session-provider'
import { spacing } from '@/lib/tokens'
import { TemplatesLayout } from './catalogue/TemplatesLayout'
import { FindMyPlanQuestions } from './find-my-plan/FindMyPlanQuestions'
import { FindMyPlanResult } from './find-my-plan/FindMyPlanResult'
import { useFindMyPlan } from './find-my-plan/useFindMyPlan'
import { templatesQueryOptions, templateSetupQueryOptions } from './queries'

export function FindMyPlanScreen() {
  const { user } = useSession()
  return user ? <FinderContent key={user.id} user={user} /> : null
}

function FinderContent({ user }: { user: User }) {
  const focused = useIsFocused()
  const templates = useQuery(templatesQueryOptions(user))
  const finder = useFindMyPlan(templates.data ?? [])
  const { activeRecommendation, phase, step } = finder
  const templateId = activeRecommendation?.template.id
  const preview = useQuery({
    ...templateSetupQueryOptions(user, templateId ?? ''),
    enabled: focused && phase === 'result' && Boolean(templateId),
  })
  // Only the visible finder handles wizard Back. A retained result must not block setup completion.
  usePreventRemove(focused && finder.canGoBack, () => finder.back())
  const back = () => {
    if (finder.canGoBack) finder.back()
    else if (router.canGoBack()) router.back()
    else router.replace('/(tabs)/program')
  }

  useEffect(() => {
    if (!focused || templates.isPending || templates.isError) return
    AccessibilityInfo.announceForAccessibility(phase === 'questions'
      ? `Question ${step + 1} of ${FIND_MY_PLAN_QUESTIONS.length}. ${FIND_MY_PLAN_QUESTIONS[step].title}`
      : activeRecommendation
        ? `${finder.activeIndex === 0 ? 'Recommended plan' : 'Good fit'}. ${activeRecommendation.family.name}. ${activeRecommendation.template.daysPerWeek} days per week.`
        : 'No plans are available right now.')
  }, [activeRecommendation, finder.activeIndex, focused, phase, step, templates.isError, templates.isPending])

  return <TemplatesLayout title="Find my plan" backLabel={finder.canGoBack ? 'Back' : 'Plans'} onBack={back}
    contentKey={`${phase}:${step}:${templateId ?? ''}`}
    footer={!templates.isError && phase === 'result' && activeRecommendation ? <Button fullWidth label="View plan"
      testID="find-my-plan-view" onPress={() => router.push({ pathname: '/template/[templateId]', params: { templateId: activeRecommendation.template.id } })} /> : undefined}>
    <Caption>{phase === 'questions' ? 'Three quick questions' : 'Your best matches'}</Caption>
    {templates.isPending ? <Panel style={{ padding: spacing.md }}><Text tone="dimmed">Loading plans…</Text></Panel>
      : templates.isError ? <>
        <EmptyState title="Plans could not load">{templates.error instanceof Error ? templates.error.message : 'Try again in a moment.'}</EmptyState>
        <Button fullWidth variant="default" label="Retry" loading={templates.isFetching} onPress={() => void templates.refetch()} />
      </> : phase === 'questions' ? <FindMyPlanQuestions step={step} answers={finder.answers} onChoose={finder.choose} />
        : <FindMyPlanResult key={templateId ?? 'no-recommendation'} answers={finder.answers}
          recommendation={activeRecommendation} activeIndex={finder.activeIndex} alternatives={finder.alternatives}
          previewOpen={finder.previewOpen} previewLoading={preview.isFetching && !preview.data}
          previewError={preview.isError ? preview.error instanceof Error ? preview.error.message : 'Plan preview is unavailable right now.' : null}
          previewSessions={preview.data?.previewWeeks[0]?.sessions ?? []}
          onEditAnswer={finder.editAnswer} onReset={finder.reset} onSelectPlan={finder.selectPlan}
          onTogglePreview={finder.togglePreview} onRetryPreview={() => void preview.refetch()} />}
  </TemplatesLayout>
}
