import { useState } from 'react'
import { View } from 'react-native'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { User } from '@supabase/supabase-js'
import { deleteBodyweightEntry, getBodyweightEntries, logBodyweight } from '@sheetless/data/account/bodyweight'
import type { BodyweightEntry, Sex } from '@sheetless/domain/account/types'
import { getApiErrorMessage } from '@sheetless/domain/shared/api-error'
import { formatCompactDate } from '@sheetless/domain/shared/dates'
import { convertWeight } from '@sheetless/domain/shared/math'
import { accountQueryKeys } from '@sheetless/domain/shared/query-keys'
import { queryStaleTimes } from '@sheetless/domain/shared/query-stale-times'
import { formatWeight } from '@sheetless/domain/shared/set-notation'
import type { Unit } from '@sheetless/domain/shared/types'
import { Button, Caption, ConfirmDialog, Panel, SectionLabel, Text, TextInput } from '@/components'
import { buildUserContext } from '@/lib/account'
import { spacing } from '@/lib/tokens'
import { SettingsSection } from './SettingsSection'

export function BodyStrengthSection({
  user,
  units,
  sex,
  settingsDisabled,
  onSexChange,
}: {
  user: User
  units: Unit
  sex: Sex | null
  settingsDisabled: boolean
  onSexChange: (value: Sex | null) => void
}) {
  const queryClient = useQueryClient()
  const [weight, setWeight] = useState('')
  const [deleteCandidate, setDeleteCandidate] = useState<BodyweightEntry | null>(null)
  const queryKey = accountQueryKeys.bodyweight(user.id)
  const entries = useQuery({
    queryKey,
    queryFn: () => getBodyweightEntries(buildUserContext(user)),
    staleTime: queryStaleTimes.profile,
  })

  const invalidateConsumers = () => {
    void queryClient.invalidateQueries({ queryKey })
    void queryClient.invalidateQueries({ queryKey: accountQueryKeys.history(user.id) })
  }

  const log = useMutation({
    mutationFn: (value: number) => logBodyweight(buildUserContext(user), { weight: value, unit: units }),
    onSuccess: (entry) => {
      queryClient.setQueryData<BodyweightEntry[]>(queryKey, (current = []) =>
        [...current.filter((item) => item.id !== entry.id && item.recordedOn !== entry.recordedOn), entry]
          .sort((left, right) => left.recordedOn.localeCompare(right.recordedOn)),
      )
      setWeight('')
      invalidateConsumers()
    },
  })

  const remove = useMutation({
    mutationFn: (id: string) => deleteBodyweightEntry(buildUserContext(user), { id }),
    onSuccess: (_result, id) => {
      queryClient.setQueryData<BodyweightEntry[]>(queryKey, (current = []) =>
        current.filter((entry) => entry.id !== id),
      )
      invalidateConsumers()
      setDeleteCandidate(null)
    },
  })

  const numericWeight = Number(weight.replace(',', '.'))
  const canLog = Number.isFinite(numericWeight) && numericWeight > 0 && !log.isPending
  const recent = (entries.data ?? []).slice(-5).reverse()

  return (
    <SettingsSection
      title="Body & Strength"
      description="Keep an optional bodyweight history and sex value with your profile."
    >
      <Panel style={{ gap: spacing.lg, padding: spacing.md }}>
        <View style={{ gap: spacing.xs }}>
          <SectionLabel>Sex</SectionLabel>
          <View style={{ flexDirection: 'row', gap: spacing.xs }}>
            {([
              { value: 'male', label: 'Male' },
              { value: 'female', label: 'Female' },
              { value: null, label: 'Prefer not to say' },
            ] as const).map((option) => (
              <Button
                key={option.value ?? 'unset'}
                label={option.label}
                selected={sex === option.value}
                variant={sex === option.value ? 'filled' : 'default'}
                style={{ flex: option.value == null ? 1.6 : 1, paddingHorizontal: spacing.xs }}
                disabled={settingsDisabled}
                onPress={() => onSexChange(option.value)}
              />
            ))}
          </View>
          <Caption>Sex is optional and is kept with your profile for supported strength calculations.</Caption>
        </View>

        <View style={{ gap: spacing.sm }}>
          <SectionLabel>Bodyweight</SectionLabel>
          <Caption>Bodyweight entries save immediately and are separate from profile Save/Discard.</Caption>
          <View style={{ alignItems: 'flex-start', flexDirection: 'row', gap: spacing.sm }}>
            <TextInput
              value={weight}
              onChangeText={setWeight}
              placeholder={`Today's weight (${units})`}
              keyboardType="decimal-pad"
              editable={!log.isPending}
              containerStyle={{ flex: 1 }}
              testID="settings-bodyweight-input"
            />
            <Button
              label="Log"
              disabled={!canLog}
              loading={log.isPending}
              onPress={() => log.mutate(numericWeight)}
              testID="settings-bodyweight-log"
            />
          </View>
          {log.isError ? (
            <Text size="sm" tone="danger">
              {getApiErrorMessage(log.error, 'Unable to log bodyweight.')}
            </Text>
          ) : null}
          {entries.isPending ? <Caption>Loading recent entries…</Caption> : null}
          {entries.isError ? (
            <Panel surface="inset" style={{ gap: spacing.sm, padding: spacing.sm }}>
              <Text size="sm" tone="warning">
                {getApiErrorMessage(entries.error, 'Recent bodyweight entries could not load.')}
              </Text>
              <Button label="Retry" variant="default" onPress={() => void entries.refetch()} />
            </Panel>
          ) : null}
          {!entries.isPending && !entries.isError && recent.length === 0 ? (
            <Caption>No bodyweight logged yet. Entries are kept as dated history for supported calculations.</Caption>
          ) : null}
          {recent.map((entry) => (
            <Panel key={entry.id} surface="inset" style={{ padding: spacing.sm }}>
              <View style={{ alignItems: 'center', flexDirection: 'row', gap: spacing.sm }}>
                <View style={{ flex: 1 }}>
                  <Text size="sm" weight={800}>
                    {formatWeight(convertWeight(entry.weightKg, 'kg', units), units)}
                  </Text>
                  <Caption>{formatCompactDate(entry.recordedOn)}</Caption>
                </View>
                <Button
                  label="Delete"
                  variant="subtle"
                  tone="danger"
                  disabled={remove.isPending}
                  loading={remove.isPending && remove.variables === entry.id}
                  onPress={() => {
                    remove.reset()
                    setDeleteCandidate(entry)
                  }}
                />
              </View>
            </Panel>
          ))}
        </View>
      </Panel>
      <ConfirmDialog
        open={Boolean(deleteCandidate)}
        title="Delete bodyweight entry?"
        confirmLabel="Delete entry"
        tone="danger"
        isPending={remove.isPending}
        error={remove.isError
          ? getApiErrorMessage(remove.error, 'Unable to delete that bodyweight entry.')
          : null}
        onCancel={() => {
          if (!remove.isPending) {
            setDeleteCandidate(null)
            remove.reset()
          }
        }}
        onConfirm={() => {
          if (deleteCandidate) remove.mutate(deleteCandidate.id)
        }}
      >
        {deleteCandidate
          ? `Remove the ${formatWeight(convertWeight(deleteCandidate.weightKg, 'kg', units), units)} entry from ${formatCompactDate(deleteCandidate.recordedOn)}?`
          : ''}
      </ConfirmDialog>
    </SettingsSection>
  )
}
