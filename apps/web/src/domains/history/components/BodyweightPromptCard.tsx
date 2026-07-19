import { Button, NumberInput, Select } from '@mantine/core'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import type { Sex, Unit } from '~/shared/types'
import { logBodyweightFn } from '~/domains/account/server/bodyweight-functions'
import { updateSexFn } from '~/domains/account/server/profile-functions'
import { Caption, Text } from '~/components'

/**
 * Inline capture for the DOTS inputs, hosted by the strength score card when
 * bodyweight and/or sex are missing. Saving invalidates the dashboard, so the
 * card upgrades itself (total → xBW → DOTS) without navigation.
 */
export function BodyweightPromptCard({
  units,
  hasBodyweight,
  hasSex,
}: {
  units: Unit | null
  hasBodyweight: boolean
  hasSex: boolean
}) {
  const queryClient = useQueryClient()
  const displayUnits: Unit = units ?? 'kg'
  const [weight, setWeight] = useState<number | string>('')
  const [sex, setSex] = useState<Sex | null>(null)

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!hasBodyweight && typeof weight === 'number' && weight > 0) {
        await logBodyweightFn({ data: { weight, unit: displayUnits } })
      }
      if (!hasSex && sex) {
        await updateSexFn({ data: { sex } })
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['history', 'dashboard'] })
      void queryClient.invalidateQueries({ queryKey: ['bodyweight'] })
      void queryClient.invalidateQueries({ queryKey: ['me'] })
    },
  })

  const canSave = (!hasBodyweight && typeof weight === 'number' && weight > 0) || (!hasSex && sex !== null)

  return (
    <div
      className="mt-3 rounded-lg p-3"
      style={{ backgroundColor: 'var(--vf-surface-2)', border: '1px dashed var(--mantine-color-default-border)' }}
    >
      <Text size="sm" fw={700}>
        {hasBodyweight ? 'One step from DOTS' : 'Unlock your strength score'}
      </Text>
      <Caption mt={2}>
        {hasBodyweight
          ? 'Add sex to upgrade your bodyweight multiple to DOTS — the score lifters track for life.'
          : 'Bodyweight turns your total into a relative-strength score (DOTS) you can compare across time.'}
      </Caption>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {!hasBodyweight ? (
          <NumberInput
            size="xs"
            w={130}
            min={1}
            max={displayUnits === 'lb' ? 1100 : 500}
            decimalScale={1}
            placeholder={`Bodyweight (${displayUnits})`}
            aria-label={`Bodyweight in ${displayUnits}`}
            value={weight}
            onChange={setWeight}
          />
        ) : null}
        {!hasSex ? (
          <Select
            size="xs"
            w={130}
            placeholder="Sex"
            aria-label="Sex (used only for DOTS scoring)"
            data={[
              { value: 'male', label: 'Male' },
              { value: 'female', label: 'Female' },
            ]}
            value={sex}
            onChange={(value) => setSex((value as Sex | null) ?? null)}
            clearable
          />
        ) : null}
        <Button size="xs" color="action" disabled={!canSave} loading={saveMutation.isPending} onClick={() => saveMutation.mutate()}>
          Save
        </Button>
      </div>
      <Caption mt={6}>Sex only picks the DOTS scoring curve. Both stay private — edit anytime in Settings.</Caption>
      {saveMutation.isError ? (
        <Text size="xs" tone="danger" mt={4}>
          Could not save — try again.
        </Text>
      ) : null}
    </div>
  )
}
