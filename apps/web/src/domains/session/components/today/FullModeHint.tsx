import { Button } from '@mantine/core'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'
import { Sparkles } from 'lucide-react'
import {
  fullModeHintCopy,
  shouldOfferFullMode,
} from '@sheetless/domain/account/experience-mode'
import { Caption, Panel, Text } from '~/components'
import { useRequiredAccountId } from '~/domains/account/components/AccountIdentityProvider'
import { experienceSignalsQueryOptions, meQueryOptions } from '~/domains/account/queries'
import { dismissFullModeHintFn } from '~/domains/account/server/experience-functions'
import { accountQueryKeys } from '~/shared/lib/query-keys'

/**
 * The one-time offer of Full mode, shown on Today once the account has enough history.
 *
 * Renders nothing until both reads have settled, so the card can only ever appear — it never
 * shows and then retracts. Either action stamps `fullModeHintDismissedAt`, and Settings ›
 * Experience is the only way back.
 */
export function FullModeHint() {
  const userId = useRequiredAccountId()
  const router = useRouter()
  const queryClient = useQueryClient()
  const meQuery = useQuery(meQueryOptions(userId))
  const signalsQuery = useQuery(experienceSignalsQueryOptions(userId))

  const dismiss = useMutation({
    mutationFn: () => dismissFullModeHintFn(),
    onSuccess: (next) => queryClient.setQueryData(accountQueryKeys.profile(userId), next),
  })

  const me = meQuery.data
  const signals = signalsQuery.data
  if (!me || !signals) return null
  if (
    !shouldOfferFullMode({
      experienceMode: me.experienceMode,
      completedSessions: signals.completedSessions,
      fullModeHintDismissedAt: me.fullModeHintDismissedAt,
    })
  ) {
    return null
  }

  const openSettings = () => {
    dismiss.mutate()
    void router.navigate({ to: '/settings', hash: 'experience' })
  }

  return (
    <Panel
      className="mb-4"
      p="sm"
      data-testid="full-mode-hint"
      style={{
        borderColor: 'var(--vf-action-border)',
        backgroundImage: 'linear-gradient(var(--vf-action-soft), var(--vf-action-soft))',
      }}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <Sparkles size={18} color="var(--vf-action-text)" className="mt-0.5 shrink-0" />
          <div className="min-w-0">
            <Text size="sm" fw={900}>{fullModeHintCopy.title}</Text>
            <Caption mt={2} lh={1.4}>{fullModeHintCopy.body}</Caption>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:shrink-0">
          <Button variant="default" disabled={dismiss.isPending} onClick={() => dismiss.mutate()}>
            {fullModeHintCopy.dismiss}
          </Button>
          <Button disabled={dismiss.isPending} onClick={openSettings}>
            {fullModeHintCopy.confirm}
          </Button>
        </div>
      </div>
    </Panel>
  )
}
