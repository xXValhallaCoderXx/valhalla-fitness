import { Button } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Sparkles, X } from 'lucide-react'
import { meQueryOptions } from '~/domains/account/queries'
import { dismissLiveOnboardingFn } from '~/domains/account/server/profile-functions'
import { buildLiveSessionSteps } from '~/domains/onboarding/onboarding-tour'
import { useOnboardingTour } from '~/domains/onboarding/useOnboardingTour'
import { Caption, Heading, Panel, SectionLabel, Text } from '~/components'
import { getApiErrorMessage } from '~/shared/lib/api-error'
import { track } from '~/shared/lib/analytics'
import type { UserProfile } from '~/shared/types'

export function LiveSessionOnboarding() {
  const queryClient = useQueryClient()
  const meQuery = useQuery(meQueryOptions())
  const { start } = useOnboardingTour(buildLiveSessionSteps, 'live')

  const dismissMutation = useMutation({
    mutationFn: () => dismissLiveOnboardingFn(),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['me'] })
      const previous = queryClient.getQueryData<UserProfile | null>(['me'])
      if (previous) {
        queryClient.setQueryData<UserProfile | null>(['me'], (current) =>
          current ? { ...current, liveOnboardingDismissed: true } : current,
        )
      }
      return { previous }
    },
    onError: (error, _variables, context) => {
      queryClient.setQueryData<UserProfile | null>(['me'], context?.previous ?? null)
      notifications.show({
        color: 'danger',
        title: 'Could not hide walkthrough',
        message: getApiErrorMessage(error, 'Unable to hide this walkthrough.'),
      })
    },
    onSuccess: (profile) => {
      queryClient.setQueryData<UserProfile | null>(['me'], profile ?? null)
    },
  })

  if (meQuery.data?.liveOnboardingDismissed !== false) return null

  const handleStartTour = () => {
    track('live_onboarding_start_tour')
    start()
  }

  const handleDismiss = () => {
    track('live_onboarding_dismiss')
    dismissMutation.mutate()
  }

  return (
    <Panel data-tour="live-onboarding" p="md" style={{ borderColor: 'var(--vf-action-border)' }}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <SectionLabel>Workout walkthrough</SectionLabel>
          <Heading order={2} size="h4" mt="xs">New to live logging?</Heading>
          <Text mt={4} size="sm" tone="dimmed">
            Type your weight and reps, rate effort with RIR, complete each set, then Finish to save.
          </Text>
          <Caption mt={6}>You can ignore this card and train normally.</Caption>
        </div>
        <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
          <Button variant="default" size="xs" onClick={handleStartTour}>
            <Sparkles size={14} />
            Show me around
          </Button>
          <Button
            variant="subtle"
            size="xs"
            color="neutral"
            disabled={dismissMutation.isPending}
            onClick={handleDismiss}
          >
            <X size={14} />
            Don't show again
          </Button>
        </div>
      </div>
    </Panel>
  )
}
