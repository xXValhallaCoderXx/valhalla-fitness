import Dexie, { type Table } from 'dexie'
import type { SetPatch } from './session-cache'
import type { WorkoutSession } from '~/types/training'

export type QueuedMutation = {
  id?: number
  clientMutationId: string
  sessionId: string
  kind: 'set_patch'
  payload: SetPatch
  createdAt: string
  retryCount: number
}

class WorkoutLocalDb extends Dexie {
  activeSessions!: Table<WorkoutSession, string>
  queuedMutations!: Table<QueuedMutation, number>

  constructor() {
    super('sheetless')
    this.version(1).stores({
      activeSessions: 'sessionId, status, updatedAt',
      queuedMutations: '++id, clientMutationId, sessionId, kind, createdAt',
    })
  }
}

export const workoutDb = new WorkoutLocalDb()

export async function saveActiveSession(session: WorkoutSession) {
  await workoutDb.activeSessions.put(session)
}

export async function getActiveSession(sessionId: string) {
  return workoutDb.activeSessions.get(sessionId)
}

export async function queueSetPatch(sessionId: string, payload: SetPatch) {
  const clientMutationId = payload.clientMutationId ?? crypto.randomUUID()
  await workoutDb.queuedMutations.put({
    clientMutationId,
    sessionId,
    kind: 'set_patch',
    payload: { ...payload, clientMutationId },
    createdAt: new Date().toISOString(),
    retryCount: 0,
  })
  return clientMutationId
}
