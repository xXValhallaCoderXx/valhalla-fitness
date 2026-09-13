import { describe, expect, it } from 'vitest'
import { prepareSetLogAttempt } from '@sheetless/domain/session/set-log-intent'
import type { SetLog } from '@sheetless/domain/session/types/session'

const failed: SetLog = {
  id: 'set-1', setIndex: 1, actualLoad: 80, actualReps: 5, actualRir: 2,
  actualRpe: 8, note: 'Controlled descent', completed: true,
  clientMutationId: 'original', syncState: 'syncFailed',
}
const newId = () => 'correction'

describe('set log intent', () => {
  it('retries the complete original intent, preserving hidden RPE and notes', () => {
    expect(prepareSetLogAttempt(failed, {
      setIndex: 1, actualLoad: 80, actualReps: 5, actualRir: 2, completed: true,
      clientMutationId: 'unused-ui-id',
    }, newId)).toMatchObject({
      actualRpe: 8, note: 'Controlled descent', clientMutationId: 'original', reconcileBeforeSave: true,
    })
  })

  it.each([
    { actualLoad: 82.5 }, { actualReps: 6 }, { actualRir: 1 },
    { completed: false }, { note: 'New note' }, { actualRpe: 9 },
  ])('gives changed failed values a fresh receipt (%j)', (correction) => {
    const attempt = prepareSetLogAttempt(failed, {
      setIndex: 1, clientMutationId: 'original', ...correction,
    }, newId)
    expect(attempt).toMatchObject({ ...correction, clientMutationId: 'correction', reconcileBeforeSave: true })
  })

  it('retries an undo without turning completion back on or clearing logged numbers', () => {
    const undo = { ...failed, completed: false }
    expect(prepareSetLogAttempt(undo, { setIndex: 1, completed: false }, newId))
      .toMatchObject({ actualLoad: 80, actualReps: 5, actualRir: 2, completed: false, clientMutationId: 'original' })
  })

  it('normalizes absent values and trimmed notes to their persisted representation', () => {
    const set = { ...failed, actualRpe: null, note: 'Note' }
    expect(prepareSetLogAttempt(set, { setIndex: 1, actualRpe: undefined, note: ' Note ' }, newId).clientMutationId)
      .toBe('original')
    expect(prepareSetLogAttempt({ ...failed, syncState: 'synced' }, { setIndex: 1, completed: true }, newId))
      .toMatchObject({ clientMutationId: 'correction', reconcileBeforeSave: false })
  })
})
