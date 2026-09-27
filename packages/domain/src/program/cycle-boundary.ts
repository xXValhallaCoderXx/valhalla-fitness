import type { z } from 'zod'
import type { cycleBoundarySchema } from './cycle-schemas'

export const structuredBlockTemplateIds = [
  'healthy-531-fsl', 'training_max_wave_pump_5day', 'bromley-volume-intensity',
  'bromley-bullmastiff', 'bromley-70s-powerlifter',
] as const

export type CycleEndPolicy = 'auto_repeat' | 'review_at_end'
export function cycleEndPolicy(templateId: string): CycleEndPolicy {
  return structuredBlockTemplateIds.some(id => id === templateId) ? 'review_at_end' : 'auto_repeat'
}

export type ProgramCycleBoundary = z.infer<typeof cycleBoundarySchema>

/** Presentation stays on the final saved workout until the next cycle is confirmed. */
export function cycleDisplayIndex(program: { currentWeekIndex: number; cycleBoundary?: ProgramCycleBoundary | null }) {
  return program.cycleBoundary?.status === 'pending'
    ? program.cycleBoundary.nextSessionIndex - 1 : program.currentWeekIndex
}

export const cycleChoiceRequiredMessage = 'Your cycle is complete. Open Today or Plan to repeat it, choose another plan, or end this plan before starting a blank workout. Update the app if these choices are unavailable.'
