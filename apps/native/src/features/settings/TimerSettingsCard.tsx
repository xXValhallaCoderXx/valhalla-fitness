import { useState } from 'react'
import { Switch, View } from 'react-native'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { updateSettings } from '@sheetless/data/account/profile'
import type { UserProfile } from '@sheetless/domain/account/types'
import { getApiErrorMessage } from '@sheetless/domain/shared/api-error'
import { accountQueryKeys } from '@sheetless/domain/shared/query-keys'
import { Button, Caption, Panel, SectionLabel, Text } from '@/components'
import { buildUserContext } from '@/lib/account'
import { useSession } from '@/lib/session-provider'
import { spacing, useTokens } from '@/lib/tokens'

const MIN_REST_SECONDS = 30
const MAX_REST_SECONDS = 600
const REST_STEP_SECONDS = 30

export function TimerSettingsCard({ profile }: { profile: UserProfile }) {
  const { user } = useSession()
  const { theme } = useTokens()
  const queryClient = useQueryClient()
  const [autoStartTimer, setAutoStartTimer] = useState(profile.autoStartTimer)
  const [defaultRestSeconds, setDefaultRestSeconds] = useState(profile.defaultRestSeconds)

  const save = useMutation({
    mutationFn: () =>
      updateSettings(buildUserContext(user!), {
        units: profile.units,
        rounding: profile.rounding,
        equipmentProfile: profile.equipmentProfile,
        themePreference: profile.themePreference,
        programStateDefaults: profile.programStateDefaults,
        sex: profile.sex ?? null,
        autoStartTimer,
        defaultRestSeconds,
      }),
    onSuccess: (nextProfile) => {
      queryClient.setQueryData(accountQueryKeys.profile(user!.id), nextProfile)
    },
  })

  const changeRest = (delta: number) => {
    setDefaultRestSeconds((current) =>
      Math.min(MAX_REST_SECONDS, Math.max(MIN_REST_SECONDS, current + delta)),
    )
  }
  const dirty =
    autoStartTimer !== profile.autoStartTimer || defaultRestSeconds !== profile.defaultRestSeconds

  return (
    <Panel style={{ gap: spacing.md, padding: spacing.md }}>
      <View style={{ alignItems: 'center', flexDirection: 'row', gap: spacing.sm }}>
        <View style={{ flex: 1, gap: 2 }}>
          <SectionLabel>Rest timer</SectionLabel>
          <Text weight={800}>Start automatically</Text>
          <Caption>Begin the rest countdown after a completed set.</Caption>
        </View>
        <Switch
          value={autoStartTimer}
          onValueChange={setAutoStartTimer}
          disabled={save.isPending}
          trackColor={{ false: theme.surfaceInset, true: theme.tones.action.border }}
          thumbColor={autoStartTimer ? theme.primaryFill : theme.textMuted}
          testID="settings-auto-rest"
        />
      </View>

      <Panel surface="inset" style={{ gap: spacing.sm, padding: spacing.sm }}>
        <View style={{ alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' }}>
          <View style={{ flex: 1 }}>
            <Text size="sm" weight={800}>Default rest</Text>
            <Caption>30-second steps · 30 seconds to 10 minutes</Caption>
          </View>
          <Text weight={900}>{formatDuration(defaultRestSeconds)}</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <Button
            label="− 30 sec"
            variant="default"
            disabled={!autoStartTimer || save.isPending || defaultRestSeconds <= MIN_REST_SECONDS}
            onPress={() => changeRest(-REST_STEP_SECONDS)}
          />
          <Button
            label="+ 30 sec"
            variant="default"
            disabled={!autoStartTimer || save.isPending || defaultRestSeconds >= MAX_REST_SECONDS}
            onPress={() => changeRest(REST_STEP_SECONDS)}
          />
        </View>
      </Panel>

      {save.isError ? (
        <Text size="sm" tone="danger">
          {getApiErrorMessage(save.error, 'Unable to save timer settings.')}
        </Text>
      ) : null}
      {save.isSuccess && !dirty ? <Text size="sm" tone="success">Timer settings saved.</Text> : null}
      <Button
        label="Save timer settings"
        fullWidth
        disabled={!dirty}
        loading={save.isPending}
        onPress={() => save.mutate()}
        testID="settings-save-timer"
      />
    </Panel>
  )
}

function formatDuration(seconds: number) {
  if (seconds < 60) return `${seconds} sec`
  const minutes = Math.floor(seconds / 60)
  const remaining = seconds % 60
  return remaining ? `${minutes}m ${remaining}s` : `${minutes} min`
}
