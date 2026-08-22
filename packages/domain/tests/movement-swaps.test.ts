import { describe, expect, it } from 'vitest'
import { buildMovementSwapOptions } from '@sheetless/domain/movement/movements'
import { listFallbackTemplateDefinitions } from '@sheetless/domain/program/template-definitions'
import {
  canUseMovementSwapPhaseScope,
  selectVisibleMovementSwapOption,
} from '@sheetless/domain/session/movement-swap-options'

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
    expect(
      options.find((option) => option.movementId === 'goblet_squat')
        ?.freeWeightCompatible,
    ).toBe(true)
    expect(
      options.find((option) => option.movementId === 'hack_squat')
        ?.freeWeightCompatible,
    ).toBe(false)
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

describe('movement swap selection', () => {
  const options = buildMovementSwapOptions({
    movementId: 'pull_up',
    role: 'accessory',
  })

  it('does not keep a selected option that is hidden by the active filter', () => {
    const visibleOptions = options.filter(
      (option) => option.movementId === 'chin_up',
    )

    expect(
      selectVisibleMovementSwapOption(visibleOptions, 'lat_pulldown')
        ?.movementId,
    ).toBe('chin_up')
    expect(
      selectVisibleMovementSwapOption([], 'lat_pulldown'),
    ).toBeNull()
  })

  it('keeps added movements session-only even when the option supports phase scope', () => {
    const phaseOption =
      options.find((option) => option.allowedScopes.includes('phase_slot')) ??
      null

    expect(phaseOption).not.toBeNull()
    expect(
      canUseMovementSwapPhaseScope({
        option: phaseOption,
        isAdHoc: false,
        isAdded: true,
      }),
    ).toBe(false)
    expect(
      canUseMovementSwapPhaseScope({
        option: phaseOption,
        isAdHoc: false,
        isAdded: false,
      }),
    ).toBe(true)
  })
})
