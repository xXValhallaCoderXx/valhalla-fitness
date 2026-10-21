import { z } from 'zod'
import type { Unit } from '../shared/types'

export const endProgramInputSchema = z.object({
  programId: z.uuid(),
  expectedVersion: z.number().int().nonnegative(),
  requestId: z.string().trim().min(1).max(200),
})

export const endProgramReceiptSchema = z.object({
  programId: z.uuid(),
  stateVersion: z.number().int().nonnegative(),
  endedAt: z.iso.datetime({ offset: true }),
})

export type EndProgramReceipt = z.infer<typeof endProgramReceiptSchema>

export type EndedProgramSummary = { id: string; title: string; endedAt: string; units: Unit }

export type ProgramEndState = {
  id: string
  title: string
  status: string
  stateVersion: number
  activeSessionId: string | null
  hasPendingDecisions: boolean
}
