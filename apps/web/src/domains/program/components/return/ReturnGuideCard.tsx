import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Button, Modal } from '@mantine/core'
import type { ProgramInstance } from '@sheetless/domain/program/types'
import { isReturnActive, returnProgressLabel } from '@sheetless/domain/program/return-settings'
import { Caption, Panel, Text } from '~/components'
import { useRequiredAccountId } from '~/domains/account/components/AccountIdentityProvider'
import { accountQueryKeys } from '~/shared/lib/query-keys'
import { getReturnGuideFn } from '../../server/program-return-functions'
import { ReturnGuideForm } from './ReturnGuideForm'

export function ReturnGuideCard({
  program,
  hasActiveSession = false,
  today = false,
  lastWorkoutLogged,
}: {
  program: ProgramInstance
  hasActiveSession?: boolean
  today?: boolean
  lastWorkoutLogged?: string | null
}) {
  const [open, setOpen] = useState(false)
  const [now] = useState(() => Date.now())
  const userId = useRequiredAccountId()
  const guide = useQuery({
    queryKey: [...accountQueryKeys.program(userId), 'return'],
    queryFn: () => getReturnGuideFn(),
    enabled: open,
    staleTime: 0,
  })
  const period = program.returnPeriod
  const active = isReturnActive(period)
  const showPrompt = lastWorkoutLogged && now - Date.parse(lastWorkoutLogged) >= 14 * 86400000
  if (today && !active && !showPrompt) return null
  return (
    <Panel p="md" mb="md">
      <Text fw={700}>
        {active && period ? returnProgressLabel(period) : 'Return after a break'}
      </Text>
      <Caption>
        {active
          ? 'Your programme advances normally. Keep current weights and review sets before ending the guide.'
          : 'Choose a gradual return while keeping your programme and its progress.'}
      </Caption>
      {active && period ? (
        <Caption>
          Suggested increases are capped at {period.settings.defaultCap} {program.units} per
          programme reference, with individual caps in the guide.
        </Caption>
      ) : null}
      {today && showPrompt ? (
        <Caption>
          Last workout logged: {lastWorkoutLogged}. You may have trained without logging it.
        </Caption>
      ) : null}
      <Button mt="sm" variant="default" disabled={hasActiveSession} onClick={() => setOpen(true)}>
        {active ? 'Review return guide' : 'Return after a break'}
      </Button>
      {hasActiveSession ? (
        <Caption>Configure the guide between workouts. Resume your saved workout normally.</Caption>
      ) : null}
      <Modal
        opened={open}
        onClose={() => setOpen(false)}
        title={active ? 'Review your return' : 'Return after a break'}
        size="lg"
      >
        {guide.isPending ? (
          <Text>Loading current programme…</Text>
        ) : guide.isError ? (
          <>
            <Text>{guide.error.message}</Text>
            <Button onClick={() => void guide.refetch()}>Retry</Button>
          </>
        ) : (
          <ReturnGuideForm
            key={`${guide.data.program.id}:${guide.data.program.stateVersion}`}
            state={guide.data}
            onClose={() => setOpen(false)}
            onRefresh={() => void guide.refetch()}
          />
        )}
      </Modal>
    </Panel>
  )
}
