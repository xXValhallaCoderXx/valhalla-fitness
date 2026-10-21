import { QueryClient } from '@tanstack/react-query'
import { describe, expect, it } from 'vitest'
import { clearWorkoutDrafts, editSetDraft, reconcileWorkoutDrafts, submittedSetDraft, workoutDraftKey } from '../src/features/session/editing/workout-drafts'
import { setDraftId } from '@sheetless/domain/session/set-draft'
import type { MovementSlot, WorkoutSession } from '@sheetless/domain/session/types/session'
const movement = { id: 'exercise', movementId: 'bench', sets: [{ setIndex: 1, completed: true, syncState: 'synced', clientMutationId: 'save' }] } as MovementSlot
const session = { sessionId: 'workout', status: 'in_progress', movements: [movement] } as WorkoutSession
const id = setDraftId(movement, 1)
const input = { load: '82.', reps: '5', rir: null }
const get = (client: QueryClient, account = 'user') => client.getQueryData<{ sets: Record<string, typeof input> }>(workoutDraftKey(account, 'workout'))?.sets

describe('memory-only workout drafts', () => {
  it('preserves raw input across unrelated data/refetches and isolates accounts/workouts/sets', () => {
    const client = new QueryClient()
    editSetDraft(client, 'user', 'workout', id, input)
    editSetDraft(client, 'user', 'workout', setDraftId(movement, 2), { ...input, load: '0' })
    editSetDraft(client, 'other', 'workout', id, { ...input, load: '20' })
    reconcileWorkoutDrafts(client, 'user', session)
    expect(get(client)?.[id].load).toBe('82.')
    clearWorkoutDrafts(client, 'user', 'workout')
    expect(get(client)).toBeUndefined()
    expect(get(client, 'other')?.[id].load).toBe('20')
    client.clear()
    expect(get(client, 'other')).toBeUndefined()
  })
  it('clears exactly a matching submitted revision, preserving newer edits and unrelated sets', () => {
    const client = new QueryClient()
    editSetDraft(client, 'user', 'workout', id, input)
    submittedSetDraft(client, 'user', 'workout', id, 'save')
    editSetDraft(client, 'user', 'workout', id, { ...input, load: '85.' })
    reconcileWorkoutDrafts(client, 'user', session)
    expect(get(client)?.[id].load).toBe('85.')
    submittedSetDraft(client, 'user', 'workout', id, 'save-2')
    editSetDraft(client, 'user', 'workout', setDraftId(movement, 2), input)
    reconcileWorkoutDrafts(client, 'user', { ...session, movements: [{ ...movement, sets: [{ ...movement.sets[0], clientMutationId: 'save-2' }] }] })
    expect(get(client)?.[id]).toBeUndefined()
    expect(get(client)?.[setDraftId(movement, 2)]).toBeTruthy()
  })
  it('keeps failures and clears only confirmed removed movement or terminal workout scopes', () => {
    const client = new QueryClient()
    editSetDraft(client, 'user', 'workout', id, input)
    editSetDraft(client, 'user', 'workout', setDraftId({ ...movement, id: 'other' }, 1), input)
    submittedSetDraft(client, 'user', 'workout', id, 'save')
    reconcileWorkoutDrafts(client, 'user', { ...session, movements: [{ ...movement, sets: [{ ...movement.sets[0], syncState: 'syncFailed' }] }] })
    expect(get(client)?.[id]).toBeTruthy()
    clearWorkoutDrafts(client, 'user', 'workout', movement.id)
    expect(Object.keys(get(client)!)).toHaveLength(1)
    reconcileWorkoutDrafts(client, 'user', { ...session, status: 'completed' })
    expect(get(client)).toBeUndefined()
  })
})

it('does not treat an Undo of saved values as submission of a different unlogged edit', () => {
  const client = new QueryClient()
  editSetDraft(client, 'user', 'workout', id, { ...input, load: '99.' })
  submittedSetDraft(client, 'user', 'workout', id, 'save', { actualLoad: 80, actualReps: 5, actualRir: null })
  reconcileWorkoutDrafts(client, 'user', session)
  expect(get(client)?.[id].load).toBe('99.')
})
