import { Button, Modal } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { movementOptionsQueryOptions } from '~/domains/session/queries'
import { addAdHocExerciseFn } from '~/domains/session/server/session-functions'
import { getApiErrorMessage } from '~/shared/lib/api-error'
import type { WorkoutSession } from '~/shared/types'
import { AccessoryMovementPicker } from './AccessoryMovementPicker'
import { buildAccessoryCategoryFilters } from './live-session-utils'

/**
 * Exercise picker for ad-hoc workouts: full catalog (competition lifts included), no
 * prescription config — picking an exercise adds it with open sets straight away.
 */
export function AddAdHocExerciseModal({
  open,
  session,
  onClose,
  onAdded,
}: {
  open: boolean
  session: WorkoutSession
  onClose: () => void
  onAdded: (movementId: string) => void
}) {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [selectedMovementId, setSelectedMovementId] = useState<string | null>(null)

  const optionsQuery = useQuery({
    ...movementOptionsQueryOptions(),
    enabled: open,
  })
  const options = useMemo(() => optionsQuery.data ?? [], [optionsQuery.data])
  const categoryFilters = useMemo(() => buildAccessoryCategoryFilters(options), [options])
  const filteredOptions = useMemo(() => {
    const query = search.trim().toLowerCase()
    const hasCategoryFilter = categoryFilter !== 'all'
    return options.filter((option) => {
      const equipment = option.equipment.join(' ').toLowerCase()
      const matchesCategory = !hasCategoryFilter || option.category === categoryFilter
      const matchesSearch = !query || (
        option.movementName.toLowerCase().includes(query) ||
        option.category.toLowerCase().includes(query) ||
        equipment.includes(query)
      )
      return matchesCategory && matchesSearch
    })
  }, [categoryFilter, options, search])
  const hasActiveFilters = Boolean(search.trim() || categoryFilter !== 'all')
  const visibleSelectedMovementId = filteredOptions.some((option) => option.movementId === selectedMovementId)
    ? selectedMovementId
    : null
  const effectiveSelectedMovementId =
    visibleSelectedMovementId ?? filteredOptions[0]?.movementId ?? (hasActiveFilters ? null : options[0]?.movementId) ?? null
  const selectedOption = options.find((option) => option.movementId === effectiveSelectedMovementId) ?? null

  const mutation = useMutation({
    mutationKey: ['addAdHocExercise', session.sessionId],
    mutationFn: (input: { movementId: string; clientMutationId: string }) =>
      addAdHocExerciseFn({
        data: {
          sessionId: session.sessionId,
          movementId: input.movementId,
          clientMutationId: input.clientMutationId,
        },
      }),
    onError: (error) => {
      notifications.show({
        color: 'danger',
        title: 'Exercise not added',
        message: getApiErrorMessage(error, 'Unable to add this exercise.'),
      })
    },
    onSuccess: (nextSession) => {
      const previousIds = new Set(session.movements.map((movement) => movement.id))
      const addedMovement =
        nextSession.movements.find((movement) => movement.isAdded && !previousIds.has(movement.id)) ??
        nextSession.movements.at(-1)
      queryClient.setQueryData(['session', session.sessionId], nextSession)
      queryClient.setQueryData(['today'], (current: any) =>
        current ? { ...current, activeSession: nextSession } : current,
      )
      if (addedMovement) onAdded(addedMovement.id)
      onClose()
    },
  })

  const submit = () => {
    if (!selectedOption || mutation.isPending) return
    mutation.mutate({ movementId: selectedOption.movementId, clientMutationId: crypto.randomUUID() })
  }

  return (
    <Modal
      opened={open}
      onClose={() => {
        if (!mutation.isPending) onClose()
      }}
      title="Add exercise"
      size="lg"
      closeOnClickOutside={!mutation.isPending}
      closeOnEscape={!mutation.isPending}
      withCloseButton={!mutation.isPending}
      classNames={{
        inner: '!items-end !p-0 sm:!items-center sm:!p-4',
        content: '!mb-0 !max-h-[96dvh] !w-full !overflow-hidden !rounded-b-none sm:!mb-auto sm:!max-w-[36rem] sm:!rounded-2xl',
        header: '!min-h-0 !px-3 !py-2 sm:!px-4',
        body: '!max-h-[calc(96dvh-3.25rem)] !overflow-y-auto !p-3 sm:!p-4',
      }}
      styles={{
        content: {
          border: '1px solid var(--mantine-color-default-border)',
          backgroundColor: 'var(--mantine-color-default)',
          color: 'var(--mantine-color-text)',
        },
        header: {
          backgroundColor: 'var(--mantine-color-default)',
          color: 'var(--mantine-color-text)',
        },
        title: {
          color: 'var(--mantine-color-text)',
          fontSize: 'var(--mantine-font-size-lg)',
          fontWeight: 700,
        },
        body: {
          color: 'var(--mantine-color-text)',
        },
        close: {
          color: 'var(--mantine-color-dimmed)',
        },
      }}
    >
      <div className="space-y-3">
        <AccessoryMovementPicker
          search={search}
          searchPlaceholder="Search exercises"
          categoryFilter={categoryFilter}
          categoryFilters={categoryFilters}
          totalCount={options.length}
          filteredOptions={filteredOptions}
          selectedMovementId={effectiveSelectedMovementId}
          isPending={optionsQuery.isPending}
          error={optionsQuery.isError ? optionsQuery.error : null}
          onSearchChange={setSearch}
          onCategoryChange={setCategoryFilter}
          onSelectMovement={setSelectedMovementId}
          onClearFilters={() => {
            setSearch('')
            setCategoryFilter('all')
          }}
        />
        <div className="grid grid-cols-2 gap-2">
          <Button type="button" variant="default" disabled={mutation.isPending} onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            data-testid="confirm-add-exercise"
            disabled={!selectedOption || mutation.isPending}
            onClick={submit}
          >
            {mutation.isPending ? 'Adding...' : 'Add exercise'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
