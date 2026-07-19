import { Button } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Sparkles, X } from 'lucide-react'
import { meQueryOptions } from '~/domains/account/queries'
import { dismissLiveOnboardingFn } from '~/domains/account/server/profile-functions'
import { buildFocusSessionSteps } from '~/domains/onboarding/onboarding-tour'
import { useOnboardingTour } from '~/domains/onboarding/useOnboardingTour'
import { SectionLabel, Text } from '~/components'
import { getApiErrorMessage } from '~/shared/lib/api-error'
import { track } from '~/shared/lib/analytics'
import type { UserProfile } from '~/shared/types'

/**
 * Compact onboarding card for the mobile Focus logger. Shares the `liveOnboardingDismissed`
 * flag with `LiveSessionOnboarding`, so dismissing in either view hides both.
 */
export function FocusSessionOnboarding() {
  const queryClient = useQueryClient()
  const meQuery = useQuery(meQueryOptions())
  const { start } = useOnboardingTour(buildFocusSessionSteps, 'focus')

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
    track('focus_onboarding_start_tour')
    start()
  }

  const handleDismiss = () => {
    track('focus_onboarding_dismiss')
    dismissMutation.mutate()
  }

  return (
    <div
      data-tour="focus-onboarding"
      className="rounded-2xl border p-3"
      style={{ borderColor: 'var(--vf-action-border)', backgroundColor: 'var(--vf-action-soft)' }}
    >
      <SectionLabel>New to live logging?</SectionLabel>
      <Text mt={2} size="sm" tone="dimmed" lh={1.35}>
        Log each set with the steppers and RIR, then tap Log set to move on.
      </Text>
      <div className="mt-3 flex gap-2">
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
          Dismiss
        </Button>
      </div>
    </div>
  )
}
