import { describe, expect, it } from 'vitest'
import { buildMovementSwapOptions } from '../src/lib/movements'

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
})
