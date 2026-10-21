import { z } from 'zod'

export const cycleBoundarySchema = z.object({
  id: z.uuid(), programId: z.uuid(), sessionId: z.uuid(), templateVersionId: z.uuid(),
  cycleNumber: z.number().int().positive(), nextSessionIndex: z.number().int().positive(),
  completedAt: z.iso.datetime({ offset: true }),
  status: z.enum(['pending', 'repeated', 'replaced', 'ended']),
  resolvedAt: z.iso.datetime({ offset: true }).nullable(),
})

export const cycleReviewInputSchema = z.object({ programId: z.uuid(), boundaryId: z.uuid() })
export const repeatCycleInputSchema = cycleReviewInputSchema.extend({
  expectedUserId: z.uuid(), expectedVersion: z.number().int().nonnegative(),
  requestId: z.string().trim().min(1).max(200),
})
export const repeatCycleReceiptSchema = z.object({
  programId: z.uuid(), boundaryId: z.uuid(), stateVersion: z.number().int().nonnegative(),
  nextSessionIndex: z.number().int().positive(), repeatedAt: z.iso.datetime({ offset: true }),
})

