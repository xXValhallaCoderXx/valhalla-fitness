import { useRef, useState } from 'react'
import { View } from 'react-native'
import { useQueryClient } from '@tanstack/react-query'
import type { User } from '@supabase/supabase-js'
import { logBodyweight } from '@sheetless/data/account/bodyweight'
import { updateSex } from '@sheetless/data/account/profile'
import type { Sex } from '@sheetless/domain/account/types'
import type { HistoryInsights } from '@sheetless/domain/history/types'
import { accountQueryKeys } from '@sheetless/domain/shared/query-keys'
import { getApiErrorMessage } from '@sheetless/domain/shared/api-error'
import { Button, Caption, Panel, SegmentedControl, Text, TextInput } from '@/components'
import { buildUserContext } from '@/lib/account'
import { spacing } from '@/lib/tokens'

export function BodyweightPrompt({ insights, user }: { insights: HistoryInsights; user: User }) {
  const client = useQueryClient()
  const hasWeight = insights.bodyweight.entries.some((entry) => entry.recordedOn <= insights.today)
  const hasSex = insights.bodyweight.sex !== null
  const [weight, setWeight] = useState('')
  const [sex, setSex] = useState<Sex | null>(null)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const busy = useRef(false)
  const value = Number(weight.replace(',', '.'))
  const canSave = (!hasWeight && value > 0) || (!hasSex && sex !== null)
  const save = async () => {
    if (busy.current || !canSave) return
    busy.current = true
    setPending(true)
    setError(null)
    try {
      const ctx = buildUserContext(user)
      if (!hasWeight && value > 0) await logBodyweight(ctx, { weight: value, unit: insights.bodyweight.units })
      if (!hasSex && sex) await updateSex(ctx, { sex })
    } catch (cause) {
      setError(getApiErrorMessage(cause, 'Unable to save. Try again.'))
    } finally {
      void client.invalidateQueries({ queryKey: accountQueryKeys.history(user.id) })
      void client.invalidateQueries({ queryKey: accountQueryKeys.bodyweight(user.id) })
      void client.invalidateQueries({ queryKey: accountQueryKeys.profile(user.id) })
      busy.current = false
      setPending(false)
    }
  }
  if (hasWeight && hasSex) return null
  return (
    <Panel surface="inset" style={{ gap: spacing.sm, padding: spacing.sm }}>
      <Text weight={800}>Complete your strength score</Text>
      {!hasWeight ? <TextInput accessibilityLabel="Bodyweight" placeholder={`Bodyweight (${insights.bodyweight.units})`}
        keyboardType="decimal-pad" value={weight} onChangeText={setWeight} editable={!pending} /> : null}
      {!hasSex ? <View><SegmentedControl options={[{ value: 'male', label: 'Male' }, { value: 'female', label: 'Female' }]}
        value={sex} onChange={setSex} variant="segments" disabled={pending} accessibilityLabel="Sex for DOTS scoring" /></View> : null}
      <Caption>Sex selects the DOTS scoring curve. Both fields are private and editable in Settings.</Caption>
      {error ? <Text tone="danger">{error}</Text> : null}
      <Button label="Save" disabled={!canSave} loading={pending} onPress={() => void save()} />
    </Panel>
  )
}
