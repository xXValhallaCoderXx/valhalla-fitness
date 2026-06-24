import { describe, expect, it } from 'vitest'
import { buildMovementSwapOptions } from '../src/lib/movements'
import { listFallbackTemplateDefinitions } from '../src/lib/template-definitions'

function resolveMovementId(movementId: string | { default: string; byPhase?: Record<string, string> }, phaseKey: string) {
  if (typeof movementId === 'string') return movementId
  return movementId.byPhase?.[phaseKey] ?? movementId.default
}

describe('movement swap options', () => {
  it('blocks main lift swaps', () => {
    expect(buildMovementSwapOptions({ movementId: 'squat', role: 'main' })).toEqual([])
  })

  it('uses only curated rules for variation swaps', () => {
    const options = buildMovementSwapOptions({ movementId: 'front_squat', role: 'variation' })

    expect(options.map((option) => option.movementId)).toContain('pause_squat')
    expect(options.map((option) => option.movementId)).toContain('safety_bar_squat')
    expect(options.every((option) => option.source === 'rule')).toBe(true)
  })

  it('lets accessory swaps fall back to catalog relationships for the current session only', () => {
    const options = buildMovementSwapOptions({
      movementId: 'chest_supported_row',
      role: 'accessory',
      rules: [],
    })

    expect(options.some((option) => option.movementId === 'dumbbell_row')).toBe(true)
    expect(options.every((option) => option.source === 'catalog')).toBe(true)
    expect(options.every((option) => option.allowedScopes.join(',') === 'session')).toBe(true)
  })

  it('orders curated accessory suggestions before related catalog fallbacks', () => {
    const options = buildMovementSwapOptions({
      movementId: 'leg_press',
      role: 'accessory',
    })
    const firstRelatedIndex = options.findIndex((option) => option.source === 'catalog')
    const lastSuggestedIndex = options.map((option) => option.source).lastIndexOf('rule')

    expect(options[0]?.source).toBe('rule')
    expect(firstRelatedIndex).toBeGreaterThan(lastSuggestedIndex)
  })

  it('has programme-level suggestions for every built-in accessory and variation slot', () => {
    const missing: string[] = []

    for (const definition of listFallbackTemplateDefinitions()) {
      const phaseKeys = Array.from(new Set(definition.weeks.map((week) => week.phaseKey)))
      for (const session of definition.sessions) {
        for (const slot of session.slots) {
          if (slot.role !== 'accessory' && slot.role !== 'variation') continue
          for (const phaseKey of phaseKeys) {
            const movementId = resolveMovementId(slot.movementId, phaseKey)
            const options = buildMovementSwapOptions({
              movementId,
              role: slot.role,
              templateId: definition.id,
              phaseKey,
              slotId: `slot-${session.id}-${slot.id}`,
            }).filter((option) => option.allowedScopes.includes('phase_slot'))

            if (!options.length) missing.push(`${definition.id}/${session.id}/${slot.id}/${phaseKey}/${movementId}`)
          }
        }
      }
    }

    expect(missing).toEqual([])
  })
})
