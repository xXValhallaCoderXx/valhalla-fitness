import { useEffect } from 'react'
import { useMutation } from '@tanstack/react-query'
import type { User } from '@supabase/supabase-js'
import { exportAccountData } from '@sheetless/data/account/data-rights'
import { getApiErrorMessage } from '@sheetless/domain/shared/api-error'
import { Button, Caption, Panel, SectionLabel, Text } from '@/components'
import { buildUserContext } from '@/lib/account'
import { spacing } from '@/lib/tokens'
import { shareAccountExport } from './account-export'
import { SettingsSection } from './SettingsSection'

export function DataSyncSection({
  user,
  disabled,
  onPendingChange,
}: {
  user: User
  disabled: boolean
  onPendingChange: (pending: boolean) => void
}) {
  const accountExport = useMutation({
    mutationFn: async () => {
      const value = await exportAccountData(buildUserContext(user))
      await shareAccountExport(value)
    },
  })

  useEffect(() => {
    onPendingChange(accountExport.isPending)
    return () => onPendingChange(false)
  }, [accountExport.isPending, onPendingChange])

  return (
    <SettingsSection
      title="Data & Sync"
      description="Review online saving and keep a portable copy of your Sheetless data."
    >
      <Panel style={{ gap: spacing.md, padding: spacing.md }}>
        <Panel surface="inset" style={{ gap: 3, padding: spacing.sm }}>
          <SectionLabel>Workout saving</SectionLabel>
          <Text size="sm" weight={800}>Online only</Text>
          <Caption>
            Changes save to Supabase while connected. Failed set saves stay flagged so you can retry.
          </Caption>
        </Panel>

        <Panel surface="inset" style={{ gap: spacing.sm, padding: spacing.sm }}>
          <SectionLabel>Account export</SectionLabel>
          <Caption>
            Create and share a JSON copy of your profile, programmes, workouts, sets, decisions, and feedback.
          </Caption>
          <Button
            label={accountExport.isPending ? 'Preparing export…' : 'Create & share JSON'}
            disabled={disabled}
            loading={accountExport.isPending}
            onPress={() => accountExport.mutate()}
            testID="settings-export-data"
          />
          {disabled ? <Caption>Save or discard profile changes before exporting.</Caption> : null}
          {accountExport.isError ? (
            <Text size="sm" tone="danger">
              {getApiErrorMessage(accountExport.error, 'Unable to prepare your account export.')}
            </Text>
          ) : null}
          {accountExport.isSuccess ? (
            <Text size="sm" tone="success">Your export was prepared.</Text>
          ) : null}
        </Panel>
      </Panel>
    </SettingsSection>
  )
}
