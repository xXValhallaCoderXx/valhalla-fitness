import { Button, NumberInput } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Caption, SectionLabel, Text } from '~/components'
import { bodyweightEntriesQueryOptions } from '~/domains/account/queries'
import { deleteBodyweightEntryFn, logBodyweightFn } from '~/domains/account/server/bodyweight-functions'
import { formatNumber } from '~/domains/history/components/insight-format'
import { getApiErrorMessage } from '~/shared/lib/api-error'
import { formatCompactDate } from '~/shared/lib/dates'
import { convertWeight } from '~/shared/lib/math'
import type { Unit } from '~/shared/types'

export function BodyweightLogger({ units }: { units: Unit }) {
  const queryClient = useQueryClient()
  const entriesQuery = useQuery(bodyweightEntriesQueryOptions())
  const [weight, setWeight] = useState<number | string>('')

  const invalidateBodyweightConsumers = () => {
    void queryClient.invalidateQueries({ queryKey: ['bodyweight'] })
    void queryClient.invalidateQueries({ queryKey: ['history', 'dashboard'] })
  }

  const logMutation = useMutation({
    mutationFn: (value: number) => logBodyweightFn({ data: { weight: value, unit: units } }),
    onSuccess: () => {
      setWeight('')
      invalidateBodyweightConsumers()
    },
    onError: (error) => {
      notifications.show({
        color: 'danger',
        title: 'Could not log bodyweight',
        message: getApiErrorMessage(error, 'Unable to log bodyweight'),
      })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteBodyweightEntryFn({ data: { id } }),
    onSuccess: invalidateBodyweightConsumers,
    onError: (error) => {
      notifications.show({
        color: 'danger',
        title: 'Could not delete entry',
        message: getApiErrorMessage(error, 'Unable to delete bodyweight entry'),
      })
    },
  })

  const canLog = typeof weight === 'number' && weight > 0
  // Server returns entries oldest-first; show the latest five, newest first.
  const recentEntries = (entriesQuery.data ?? []).slice(-5).reverse()

  return (
    <div className="grid content-start gap-1.5">
      <SectionLabel>Bodyweight</SectionLabel>
      <div className="flex items-start gap-2">
        <NumberInput
          className="min-w-0 flex-1"
          min={1}
          max={units === 'lb' ? 1100 : 500}
          decimalScale={1}
          suffix={` ${units}`}
          placeholder={`Today's weight (${units})`}
          aria-label={`Bodyweight in ${units}`}
          value={weight}
          onChange={setWeight}
        />
        <Button
          className="shrink-0"
          disabled={!canLog}
          loading={logMutation.isPending}
          onClick={() => {
            if (typeof weight === 'number' && weight > 0) logMutation.mutate(weight)
          }}
        >
          Log weight
        </Button>
      </div>
      {recentEntries.length ? (
        <div className="mt-1 grid gap-0.5">
          {recentEntries.map((entry) => (
            <div key={entry.id} className="flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-baseline gap-1.5">
                <Text size="sm" fw={700}>
                  {formatNumber(convertWeight(entry.weightKg, 'kg', units))} {units}
                </Text>
                <Caption>· {formatCompactDate(entry.recordedOn)}</Caption>
              </div>
              <button
                type="button"
                aria-label={`Delete bodyweight entry from ${formatCompactDate(entry.recordedOn)}`}
                className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition"
                disabled={deleteMutation.isPending}
                onClick={() => deleteMutation.mutate(entry.id)}
              >
                <Trash2 size={14} color="var(--mantine-color-dimmed)" />
              </button>
            </div>
          ))}
        </div>
      ) : entriesQuery.isPending ? null : (
        <Caption mt={1} lh={1.4}>
          No bodyweight logged yet — your DOTS score unlocks with the first entry.
        </Caption>
      )}
    </div>
  )
}
