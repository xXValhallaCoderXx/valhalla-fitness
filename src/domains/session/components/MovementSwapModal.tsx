import { Button, Checkbox, Modal, Select, TextInput } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { Caption, Panel, SectionLabel, Text } from '~/components'
import { movementSwapOptionsQueryOptions } from '~/domains/session/queries'
import { patchMovementInSession } from '~/domains/session/lib/session-cache'
import { substituteMovementFn } from '~/domains/session/server/session-functions'
import { getApiErrorMessage } from '~/shared/lib/api-error'
import type {
  MovementSlot,
  MovementSwapOption,
  SubstitutionReason,
  SwapScope,
  WorkoutSession,
} from '~/shared/types'
import { HistoryStatus, RolePill } from './LiveSessionControls'
import { defaultFieldStyles, defaultSelectStyles, insetFieldStyles } from './form-styles'
import { phaseScopeLabel, substitutionReasons } from './live-session-utils'
import { MovementSwapOptionRow } from './MovementSwapOptionRow'

export function MovementSwapModal({
  open,
  session,
  movement,
  onClose,
}: {
  open: boolean
  session: WorkoutSession
  movement: MovementSlot
  onClose: () => void
}) {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [selectedMovementId, setSelectedMovementId] = useState<string | null>(null)
  const [reason, setReason] = useState<SubstitutionReason>('equipment_missing')
  const [scope, setScope] = useState<SwapScope>('session')
  const [note, setNote] = useState('')

  const optionsQuery = useQuery({
    ...movementSwapOptionsQueryOptions(session.sessionId, movement.id),
    enabled: open && movement.role !== 'main',
  })
  const options = useMemo(() => optionsQuery.data ?? [], [optionsQuery.data])
  const filteredOptions = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return options
    return options.filter((option) => {
      const equipment = option.equipment.join(' ').toLowerCase()
      return (
        option.movementName.toLowerCase().includes(query) ||
        option.category.toLowerCase().includes(query) ||
        equipment.includes(query)
      )
    })
  }, [options, search])
  const effectiveSelectedMovementId = selectedMovementId ?? options[0]?.movementId ?? null
  const selectedOption = options.find((option) => option.movementId === effectiveSelectedMovementId) ?? null
  const canUsePhaseScope = Boolean(selectedOption?.allowedScopes.includes('phase_slot'))
  const effectiveScope: SwapScope = scope === 'phase_slot' && canUsePhaseScope ? 'phase_slot' : 'session'
  const phaseLabel = phaseScopeLabel(session)

  const mutation = useMutation({
    mutationKey: ['substituteMovement', session.sessionId, movement.id],
    mutationFn: (input: {
      option: MovementSwapOption
      reason: SubstitutionReason
      note?: string
      scope: SwapScope
    }) =>
      substituteMovementFn({
        data: {
          sessionId: session.sessionId,
          exerciseLogId: movement.id,
          performedMovementId: input.option.movementId,
          reason: input.reason,
          note: input.note,
          scope: input.scope,
        },
      }),
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: ['session', session.sessionId] })
      const previous = queryClient.getQueryData<WorkoutSession>(['session', session.sessionId])
      if (previous) {
        queryClient.setQueryData(
          ['session', session.sessionId],
          patchMovementInSession(previous, {
            exerciseLogId: movement.id,
            performedMovementId: input.option.movementId,
            performedMovementName: input.option.movementName,
          }),
        )
      }
      return { previous }
    },
    onError: (error, _input, context) => {
      if (context?.previous) queryClient.setQueryData(['session', session.sessionId], context.previous)
      notifications.show({
        color: 'danger',
        title: 'Movement not swapped',
        message: getApiErrorMessage(error, 'Unable to swap this movement.'),
      })
    },
    onSuccess: async (nextSession, input) => {
      queryClient.setQueryData(['session', session.sessionId], nextSession)
      queryClient.setQueryData(['today'], (current: any) =>
        current ? { ...current, activeSession: nextSession } : current,
      )
      await queryClient.invalidateQueries({ queryKey: ['movementSwapOptions', session.sessionId, movement.id] })
      if (input.scope === 'phase_slot') {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['today'] }),
          queryClient.invalidateQueries({ queryKey: ['activeProgram'] }),
        ])
      }
      notifications.show({
        color: 'success',
        title: 'Movement swapped',
        message: input.scope === 'phase_slot' ? `This slot will use the selection for ${phaseLabel.toLowerCase()}.` : 'This session was updated.',
      })
      onClose()
    },
  })

  const submit = () => {
    if (!selectedOption || mutation.isPending) return
    mutation.mutate({
      option: selectedOption,
      reason,
      note: note.trim() || undefined,
      scope: effectiveScope,
    })
  }

  return (
    <Modal
      opened={open}
      onClose={() => {
        if (!mutation.isPending) onClose()
      }}
      title="Swap movement"
      size="lg"
      closeOnClickOutside={!mutation.isPending}
      closeOnEscape={!mutation.isPending}
      withCloseButton={!mutation.isPending}
      classNames={{
        inner: '!items-end sm:!items-center',
        content: '!mb-0 !max-h-[92dvh] !w-full !overflow-hidden !rounded-b-none sm:!mb-auto sm:!max-w-[60rem] sm:!rounded-lg',
        body: '!max-h-[calc(92dvh-4rem)] !overflow-y-auto',
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
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(18rem,0.85fr)]">
        <div className="min-h-0 space-y-3">
          <Panel surface="inset" p="sm">
            <SectionLabel>Planned</SectionLabel>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <Text component="p" size="md" fw={900}>{movement.movementName}</Text>
              <RolePill role={movement.role} subtle />
            </div>
            {movement.performedMovementId && movement.performedMovementId !== movement.movementId ? (
              <Caption component="p" mt="xs" fw={700} c="var(--vf-warning-text)">
                Currently performed as {movement.performedMovementName}
              </Caption>
            ) : null}
            <Caption component="p" mt="xs">{movement.targetSummary}</Caption>
          </Panel>

          <TextInput
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search alternatives"
            styles={insetFieldStyles}
          />

          {optionsQuery.isPending ? (
            <HistoryStatus>Loading suggested movements...</HistoryStatus>
          ) : optionsQuery.isError ? (
            <HistoryStatus tone="danger">{getApiErrorMessage(optionsQuery.error, 'Unable to load movement options')}</HistoryStatus>
          ) : filteredOptions.length ? (
            <div className="max-h-[38dvh] space-y-2 overflow-y-auto pr-1 lg:max-h-[28rem]">
              {filteredOptions.map((option) => (
                <MovementSwapOptionRow
                  key={option.movementId}
                  option={option}
                  selected={option.movementId === effectiveSelectedMovementId}
                  onSelect={() => setSelectedMovementId(option.movementId)}
                />
              ))}
            </div>
          ) : (
            <HistoryStatus>No matching movements found.</HistoryStatus>
          )}
        </div>

        <Panel surface="inset" className="space-y-3" p="sm">
          <div>
            <SectionLabel>Swap details</SectionLabel>
            <Caption component="p" mt={4}>
              Choose why this movement is changing and whether the choice applies only now or to this phase slot.
            </Caption>
          </div>
          <Select
            label="Reason"
            data={substitutionReasons}
            value={reason}
            onChange={(value) => setReason((value ?? 'equipment_missing') as SubstitutionReason)}
            allowDeselect={false}
            disabled={mutation.isPending}
            styles={defaultSelectStyles}
          />
          <TextInput
            label="Note"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Optional"
            disabled={mutation.isPending}
            styles={defaultFieldStyles}
          />
          <Checkbox
            checked={effectiveScope === 'phase_slot'}
            disabled={!canUsePhaseScope || mutation.isPending}
            onChange={(event) => setScope(event.currentTarget.checked ? 'phase_slot' : 'session')}
            label={`Use for this slot for ${phaseLabel.toLowerCase()}`}
            styles={{
              label: {
                color: 'var(--mantine-color-text)',
                fontSize: 'var(--mantine-font-size-sm)',
                fontWeight: 600,
              },
              input: {
                borderColor: 'var(--mantine-color-default-border)',
              },
            }}
          />
          <Panel p="sm">
            <SectionLabel>Selected</SectionLabel>
            <Text component="p" mt={4} size="sm" fw={900}>{selectedOption?.movementName ?? 'No movement selected'}</Text>
            <Caption component="p" mt={2}>
              {effectiveScope === 'phase_slot' ? phaseLabel : 'This session only'}
            </Caption>
          </Panel>
          <div className="grid grid-cols-2 gap-2 pt-1">
            <Button
              type="button"
              variant="default"
              disabled={mutation.isPending}
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={!selectedOption || mutation.isPending}
              onClick={submit}
            >
              {mutation.isPending ? 'Swapping...' : 'Swap'}
            </Button>
          </div>
        </Panel>
      </div>
    </Modal>
  )
}
