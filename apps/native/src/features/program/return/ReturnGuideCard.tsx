import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { ProgramInstance } from '@sheetless/domain/program/types'
import { isReturnActive, returnProgressLabel } from '@sheetless/domain/program/return-settings'
import { getReturnGuide } from '@sheetless/data/program/return-guide'
import { accountQueryKeys } from '@sheetless/domain/shared/query-keys'
import { Button, Caption, Panel, SheetModal, Text } from '@/components'
import { useSession } from '@/lib/session-provider'
import { buildUserContext } from '@/lib/account'
import { spacing } from '@/lib/tokens'
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
  const { user } = useSession()
  const [open, setOpen] = useState(false)
  const [now] = useState(() => Date.now())
  const [saving, setSaving] = useState(false)
  const query = useQuery({
    queryKey: [...accountQueryKeys.program(user!.id), 'return'],
    queryFn: () => getReturnGuide(buildUserContext(user!)),
    enabled: open && Boolean(user),
    staleTime: 0,
  })
  const active = isReturnActive(program.returnPeriod)
  const prompt = lastWorkoutLogged && now - Date.parse(lastWorkoutLogged) >= 14 * 86400000
  if (today && !active && !prompt) return null
  return (
    <>
      <Panel style={{ padding: spacing.md, gap: spacing.sm }}>
        <Text weight={700}>
          {active && program.returnPeriod
            ? returnProgressLabel(program.returnPeriod)
            : 'Return after a break'}
        </Text>
        <Caption>
          {active
            ? 'Your programme advances normally. Review sets before ending the guide.'
            : 'Choose a gradual return while keeping your programme and its progress.'}
        </Caption>
        {active && program.returnPeriod ? (
          <Caption>
            Suggested increases are capped at {program.returnPeriod.settings.defaultCap}{' '}
            {program.units} per programme reference, with individual caps in the guide.
          </Caption>
        ) : null}
        {today && prompt ? (
          <Caption>
            Last workout logged: {lastWorkoutLogged}. You may have trained without logging it.
          </Caption>
        ) : null}
        <Button
          label={active ? 'Review return guide' : 'Return after a break'}
          variant="default"
          disabled={hasActiveSession}
          onPress={() => setOpen(true)}
        />
        {hasActiveSession ? (
          <Caption>
            Configure the guide between workouts. Resume your saved workout normally.
          </Caption>
        ) : null}
      </Panel>
      {open ? (
        <SheetModal
          open
          title={active ? 'Review your return' : 'Return after a break'}
          onClose={() => setOpen(false)}
          closeDisabled={saving}
        >
          {query.isPending ? (
            <Text>Loading current programme…</Text>
          ) : query.isError ? (
            <>
              <Text tone="danger">{query.error.message}</Text>
              <Button label="Retry" onPress={() => void query.refetch()} />
            </>
          ) : (
            <ReturnGuideForm
              key={`${query.data.program.id}:${query.data.program.stateVersion}`}
              state={query.data}
              onClose={() => setOpen(false)}
              onRefresh={() => void query.refetch()}
              onSaving={setSaving}
            />
          )}
        </SheetModal>
      ) : null}
    </>
  )
}
