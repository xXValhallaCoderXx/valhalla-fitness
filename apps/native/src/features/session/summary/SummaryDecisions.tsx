import { useState } from 'react'
import { View } from 'react-native'
import type { User } from '@supabase/supabase-js'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Check, Minus, TrendingUp } from 'lucide-react-native'
import {
  resolveProgressionDecision,
  resolveProgressionDecisions,
} from '@sheetless/data/program/active-program'
import type { ProgressionDecision } from '@sheetless/domain/program/types'
import { getApiErrorMessage } from '@sheetless/domain/shared/api-error'
import { accountQueryKeys } from '@sheetless/domain/shared/query-keys'
import type { Unit } from '@sheetless/domain/shared/types'
import { decisionUpdate } from '@sheetless/domain/session/summary-decisions'
import { Badge, Button, Caption, Heading, Panel, Text } from '@/components'
import { buildUserContext } from '@/lib/account'
import { useStableMutationRequest } from '@/lib/useStableMutationRequest'
import { spacing, useTokens } from '@/lib/tokens'

type DecidedState = 'applied' | 'kept'

export function SummaryDecisions({
  decisions,
  units,
  user,
}: {
  decisions: ProgressionDecision[]
  units: Unit
  user: User
}) {
  const { theme } = useTokens()
  const queryClient = useQueryClient()
  const singleRequest = useStableMutationRequest()
  const allRequest = useStableMutationRequest()
  const [decided, setDecided] = useState<Map<string, DecidedState>>(() => new Map())
  const pending = decisions.filter((decision) => !decided.has(decision.id))
  const appliedCount = [...decided.values()].filter((state) => state === 'applied').length

  const refreshPlan = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: accountQueryKeys.today(user.id) }),
      queryClient.invalidateQueries({ queryKey: accountQueryKeys.program(user.id) }),
    ])

  const single = useMutation({
    mutationFn: ({ decisionId, action }: { decisionId: string; action: 'accepted' | 'dismissed' }) =>
      resolveProgressionDecision(buildUserContext(user), {
        decisionId,
        action,
        requestId: singleRequest.requestIdFor({ decisionId, action }),
      }),
    onSuccess: async (_remaining, variables) => {
      singleRequest.clearRequest()
      setDecided((current) =>
        new Map(current).set(variables.decisionId, variables.action === 'accepted' ? 'applied' : 'kept'),
      )
      await refreshPlan()
    },
  })

  const applyAll = useMutation({
    mutationFn: (decisionIds: string[]) =>
      resolveProgressionDecisions(buildUserContext(user), {
        decisionIds,
        action: 'accepted',
        requestId: allRequest.requestIdFor({ decisionIds, action: 'accepted' }),
      }),
    onSuccess: async (decisionIds) => {
      allRequest.clearRequest()
      setDecided((current) => {
        const next = new Map(current)
        for (const id of decisionIds) next.set(id, 'applied')
        return next
      })
      await refreshPlan()
    },
  })

  const isSaving = single.isPending || applyAll.isPending
  const error = single.error ?? applyAll.error

  if (pending.length === 0) {
    return (
      <Panel
        style={{
          alignItems: 'center',
          borderColor: theme.tones.success.border,
          gap: spacing.xs,
          padding: spacing.lg,
        }}
      >
        <Check color={theme.tones.success.text} size={25} />
        <Heading order={3}>{appliedCount ? 'Next workout updated' : 'Current loads kept'}</Heading>
        <Text size="sm" tone="dimmed" align="center">
          {appliedCount
            ? `${appliedCount} load${appliedCount === 1 ? '' : 's'} updated for your next session.`
            : 'Nothing else to do.'}
        </Text>
      </Panel>
    )
  }

  return (
    <Panel style={{ borderColor: theme.tones.action.border, overflow: 'hidden' }}>
      <View
        style={{
          alignItems: 'center',
          backgroundColor: theme.tones.action.soft,
          flexDirection: 'row',
          gap: spacing.sm,
          padding: spacing.md,
        }}
      >
        <TrendingUp color={theme.tones.action.text} size={22} />
        <View style={{ flex: 1 }}>
          <Heading order={3}>{pending.length} load update{pending.length === 1 ? '' : 's'} ready</Heading>
          <Caption>Applies to your next workout.</Caption>
        </View>
      </View>

      <View style={{ gap: spacing.sm, padding: spacing.md }}>
        {decisions.map((decision) => {
          const update = decisionUpdate(decision, units)
          const state = decided.get(decision.id)
          return (
            <Panel
              key={decision.id}
              surface="inset"
              style={{
                backgroundColor: state === 'applied' ? theme.tones.success.soft : theme.surface2,
                borderColor: state === 'applied' ? theme.tones.success.border : theme.border,
                gap: 6,
                padding: spacing.sm,
              }}
            >
              <Text size="sm" weight={800}>{update.name}</Text>
              {update.isNumeric ? (
                <View style={{ alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: 5 }}>
                  <Caption>{update.fromLabel} →</Caption>
                  <Text size="sm" tone="action" weight={800}>{update.toLabel}</Text>
                  {update.deltaLabel ? <Badge tone={update.delta && update.delta < 0 ? 'warning' : 'success'}>{update.deltaLabel}</Badge> : null}
                </View>
              ) : (
                <Caption>{update.recommendation}</Caption>
              )}
              {state ? (
                <View style={{ alignItems: 'center', flexDirection: 'row', gap: 5 }}>
                  {state === 'applied' ? (
                    <Check color={theme.tones.success.text} size={14} />
                  ) : (
                    <Minus color={theme.textMuted} size={14} />
                  )}
                  <Caption tone={state === 'applied' ? 'success' : 'dimmed'}>
                    {state === 'applied' ? 'Applied' : 'Kept'}
                  </Caption>
                </View>
              ) : (
                <View style={{ flexDirection: 'row', gap: spacing.xs }}>
                  <Button
                    label="Apply"
                    disabled={isSaving}
                    onPress={() => single.mutate({ decisionId: decision.id, action: 'accepted' })}
                  />
                  <Button
                    label="Keep"
                    variant="default"
                    disabled={isSaving}
                    onPress={() => single.mutate({ decisionId: decision.id, action: 'dismissed' })}
                  />
                </View>
              )}
            </Panel>
          )
        })}

        {error ? (
          <Text size="sm" tone="danger">
            {getApiErrorMessage(error, 'Unable to save that progression choice. Try again.')}
          </Text>
        ) : null}
        <Button
          label={`Apply all ${pending.length}`}
          fullWidth
          loading={applyAll.isPending}
          disabled={single.isPending}
          onPress={() => applyAll.mutate(pending.map((decision) => decision.id))}
        />
      </View>
    </Panel>
  )
}
