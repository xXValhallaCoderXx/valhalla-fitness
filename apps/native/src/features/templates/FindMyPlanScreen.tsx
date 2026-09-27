import { useEffect, useState } from 'react'
import { AccessibilityInfo } from 'react-native'
import { router, useIsFocused } from 'expo-router'
import { usePreventRemove } from 'expo-router/react-navigation'
import { useQuery } from '@tanstack/react-query'
import type { User } from '@supabase/supabase-js'
import { Button, Caption, EmptyState, Panel, Text } from '@/components'
import { useSession } from '@/lib/session-provider'
import { spacing } from '@/lib/tokens'
import { TemplatesLayout } from './catalogue/TemplatesLayout'
import { FindMyPlanQuestions } from './find-my-plan/FindMyPlanQuestions'
import { FindMyPlanResult } from './find-my-plan/FindMyPlanResult'
import { useFindMyPlan } from './find-my-plan/useFindMyPlan'
import { NATIVE_FIND_MY_PLAN_QUESTIONS } from './find-my-plan/native-find-my-plan'
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
  const [exitRequested, setExitRequested] = useState(false)
  const templateId = activeRecommendation?.template.id
  const preview = useQuery({
    ...templateSetupQueryOptions(user, templateId ?? ''),
    enabled: focused && phase === 'result' && Boolean(templateId),
  })
  // Only the visible finder handles wizard Back. A retained result must not block setup completion.
  usePreventRemove(focused && finder.canGoBack && !exitRequested, () => finder.back())
  const back = () => {
    if (finder.canGoBack) finder.back()
    else if (router.canGoBack()) router.back()
    else router.replace('/(tabs)/program')
  }
  const browse = () => setExitRequested(true)
  const entryParams = { templateId: templateId ?? '', source: 'finder', finderDays: String(finder.answers.days ?? '') }

  useEffect(() => {
    if (exitRequested) router.dismissTo('/templates')
  }, [exitRequested])

  useEffect(() => {
    if (!focused || templates.isPending || templates.isError) return
    AccessibilityInfo.announceForAccessibility(phase === 'questions'
      ? `Question ${step + 1} of ${NATIVE_FIND_MY_PLAN_QUESTIONS.length}. ${NATIVE_FIND_MY_PLAN_QUESTIONS[step].title}`
      : activeRecommendation
        ? `${finder.activeIndex === 0 ? 'Recommended plan' : 'Good fit'}. ${activeRecommendation.family.name}. ${activeRecommendation.template.daysPerWeek} days per week.`
        : 'No plans fit your available training days. Change your answer or browse the full library.')
  }, [activeRecommendation, finder.activeIndex, focused, phase, step, templates.isError, templates.isPending])

  return <TemplatesLayout title="Find my plan" backLabel={finder.canGoBack ? 'Back' : 'Plans'} onBack={back}
    contentKey={`${phase}:${step}:${templateId ?? ''}`}
    footer={!templates.isError && !templates.isPending ? phase === 'questions' ? <>
      <Button fullWidth label={step === NATIVE_FIND_MY_PLAN_QUESTIONS.length - 1 ? 'See my match' : 'Continue'}
        disabled={!finder.canAdvance} onPress={finder.advance} />
      <Button fullWidth label="Skip these questions" variant="subtle" onPress={browse} />
    </> : activeRecommendation ? <Button fullWidth label="Set up this plan"
      testID="find-my-plan-setup" onPress={() => router.push({ pathname: '/template/[templateId]/setup', params: entryParams })} /> : undefined : undefined}>
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
          onBrowse={browse} onOpenDetail={() => router.push({ pathname: '/template/[templateId]', params: entryParams })}
          onTogglePreview={finder.togglePreview} onRetryPreview={() => void preview.refetch()} />}
  </TemplatesLayout>
}
