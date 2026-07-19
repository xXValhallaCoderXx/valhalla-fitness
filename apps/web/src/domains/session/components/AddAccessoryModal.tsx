import { Modal } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { accessoryMovementOptionsQueryOptions } from '~/domains/session/queries'
import { addSessionAccessoryFn } from '~/domains/session/server/session-functions'
import { parseAccessoryRepTarget } from '~/domains/session/lib/accessories'
import { getApiErrorMessage } from '~/shared/lib/api-error'
import type {
  AccessoryMovementOption,
  AccessoryProgressionMethod,
  SwapScope,
  WorkoutSession,
} from '~/shared/types'
import { AddAccessoryConfigPanel } from './AddAccessoryConfigPanel'
import { AccessoryMovementPicker } from './AccessoryMovementPicker'
import {
  buildAccessoryCategoryFilters,
  phaseScopeLabel,
} from './live-session-utils'

export function AddAccessoryModal({
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
  const [progressionMethod, setProgressionMethod] = useState<AccessoryProgressionMethod>('history_only')
  const [methodHelpOpen, setMethodHelpOpen] = useState(false)
  const [repMin, setRepMin] = useState('8')
  const [repMax, setRepMax] = useState('12')
  const [scope, setScope] = useState<SwapScope>('session')
  const [note, setNote] = useState('')

  const optionsQuery = useQuery({
    ...accessoryMovementOptionsQueryOptions(),
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
  const hasActiveAccessoryFilters = Boolean(search.trim() || categoryFilter !== 'all')
  const visibleSelectedMovementId = filteredOptions.some((option) => option.movementId === selectedMovementId)
    ? selectedMovementId
    : null
  const effectiveSelectedMovementId =
    visibleSelectedMovementId ?? filteredOptions[0]?.movementId ?? (hasActiveAccessoryFilters ? null : options[0]?.movementId) ?? null
  const selectedOption = options.find((option) => option.movementId === effectiveSelectedMovementId) ?? null
  const phaseLabel = phaseScopeLabel(session)
  const repTargetInput = buildAccessoryRepTargetInput(repMin, repMax)
  const parsedRepTarget = repTargetInput.error ? null : parseAccessoryRepTarget(repTargetInput.value)

  const mutation = useMutation({
    mutationKey: ['addSessionAccessory', session.sessionId],
    mutationFn: (input: {
      movement: AccessoryMovementOption
      progressionMethod: AccessoryProgressionMethod
      repTarget: string
      scope: SwapScope
      note?: string
      clientMutationId: string
    }) =>
      addSessionAccessoryFn({
        data: {
          sessionId: session.sessionId,
          movementId: input.movement.movementId,
          progressionMethod: input.progressionMethod,
          repTarget: input.repTarget,
          scope: input.scope,
          note: input.note,
          clientMutationId: input.clientMutationId,
        },
      }),
    onError: (error) => {
      notifications.show({
        color: 'danger',
        title: 'Accessory not added',
        message: getApiErrorMessage(error, 'Unable to add this accessory.'),
      })
    },
    onSuccess: async (nextSession, input) => {
      const previousIds = new Set(session.movements.map((movement) => movement.id))
      const addedMovement =
        nextSession.movements.find((movement) => movement.isAdded && !previousIds.has(movement.id)) ??
        nextSession.movements.at(-1)
      queryClient.setQueryData(['session', session.sessionId], nextSession)
      queryClient.setQueryData(['today'], (current: any) =>
        current ? { ...current, activeSession: nextSession } : current,
      )
      if (input.scope === 'phase_slot') {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['today'] }),
          queryClient.invalidateQueries({ queryKey: ['activeProgram'] }),
          queryClient.invalidateQueries({ queryKey: ['programOverview'] }),
        ])
      }
      notifications.show({
        color: 'success',
        title: 'Accessory added',
        message: input.scope === 'phase_slot' ? `Added for ${phaseLabel.toLowerCase()}.` : 'Added to this session.',
      })
      if (addedMovement) onAdded(addedMovement.id)
      onClose()
    },
  })

  const submit = () => {
    if (!selectedOption || !parsedRepTarget || mutation.isPending) return
    mutation.mutate({
      movement: selectedOption,
      progressionMethod,
      repTarget: repTargetInput.value,
      scope,
      note: note.trim() || undefined,
      clientMutationId: crypto.randomUUID(),
    })
  }

  return (
    <Modal
      opened={open}
      onClose={() => {
        if (!mutation.isPending) onClose()
      }}
      title="Add accessory"
      size="lg"
      closeOnClickOutside={!mutation.isPending}
      closeOnEscape={!mutation.isPending}
      withCloseButton={!mutation.isPending}
      classNames={{
        inner: '!items-end !p-0 sm:!items-center sm:!p-4',
        content: '!mb-0 !max-h-[96dvh] !w-full !max-w-full !overflow-hidden !rounded-b-none sm:!mb-auto sm:!max-w-[56rem] sm:!rounded-2xl',
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
      {/* minmax(0,1fr): an auto track would size to the category strip's intrinsic
          width (all chips side by side) and overflow narrow screens. */}
      <div
        className="grid min-w-0 max-w-full grid-cols-[minmax(0,1fr)] gap-3 lg:grid-cols-[minmax(0,1.15fr)_minmax(18rem,0.85fr)]"
        data-testid="add-accessory-modal-body"
      >
        <AccessoryMovementPicker
          search={search}
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

        <AddAccessoryConfigPanel
          progressionMethod={progressionMethod}
          methodHelpOpen={methodHelpOpen}
          repMin={repMin}
          repMax={repMax}
          repTargetError={repTargetInput.error}
          parsedRepLabel={parsedRepTarget?.label ?? null}
          note={note}
          scope={scope}
          phaseLabel={phaseLabel}
          selectedMovementName={selectedOption?.movementName ?? null}
          isPending={mutation.isPending}
          canSubmit={Boolean(selectedOption && parsedRepTarget)}
          onProgressionMethodChange={setProgressionMethod}
          onMethodHelpOpenChange={setMethodHelpOpen}
          onRepMinChange={setRepMin}
          onRepMaxChange={setRepMax}
          onNoteChange={setNote}
          onScopeChange={setScope}
          onClose={onClose}
          onSubmit={submit}
        />
      </div>
    </Modal>
  )
}

function buildAccessoryRepTargetInput(repMin: string, repMax: string) {
  const minInput = repMin.trim()
  const maxInput = repMax.trim()
  if (!minInput && !maxInput) return { value: '', error: 'Enter a rep target.' }
  const min = Number(minInput || maxInput)
  const max = Number(maxInput || minInput)
  if (!validRepBound(min) || !validRepBound(max)) return { value: '', error: 'Use reps from 1 to 100.' }
  if (max < min) return { value: '', error: 'Max reps should be at least min reps.' }
  return {
    value: min === max ? String(min) : `${min}-${max}`,
  }
}

function validRepBound(value: number) {
  return Number.isInteger(value) && value > 0 && value <= 100
}
