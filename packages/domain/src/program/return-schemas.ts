import { z } from 'zod'
import { returnSettingsSchema } from './return-settings'

export const changeReturnInputSchema = z.object({
  programId: z.uuid(),
  expectedVersion: z.number().int().nonnegative(),
  requestId: z.string().min(1).max(200),
  action: z.enum(['apply', 'update', 'extend', 'end']),
  settings: returnSettingsSchema,
  changes: z.array(
    z.object({
      key: z.string(),
      kind: z.enum(['state', 'fixed', 'accessory']),
      label: z.string(),
      before: z.number().nonnegative(),
      after: z.number().min(0).max(99999),
      selector: z
        .object({
          templateSessionId: z.string(),
          slotId: z.string(),
          weekIndex: z.number().int().nonnegative(),
          movementId: z.string(),
          setIndex: z.number().int().positive(),
        })
        .optional(),
      accessoryId: z.uuid().optional(),
      setIndex: z.number().int().positive().optional(),
    }),
  ),
  pendingDecisionIds: z.array(z.uuid()),
})
