import { describe, expect, it } from 'vitest'
import {
  filterMovementCatalog,
  freeWeightAlternativesFor,
  freeWeightPolicyV1,
  isActiveMovement,
  isFreeWeightMovement,
  movementCatalog,
  searchMovementCatalog,
} from '@sheetless/domain/movement/movements'
import {
  accessoryMovementOptions,
  loggerMovementOptions,
  variationMovementOptions,
} from '@sheetless/domain/program/custom-builder-ui'
import { createDefaultCustomProgramBuilderInput } from '@sheetless/domain/program/custom-program-meta'

const deprecatedMovementIds = [
  'chest_supported_row',
  'split_squat',
  'back_extension',
  'overhead_triceps_extension',
  'skullcrusher',
  'rear_delt_fly',
  't_bar_row',
  'lunge',
  'upright_row',
  'french_press',
  'side_bend',
]

describe('movement catalog taxonomy', () => {
  it('stores 151 movements while exposing 140 active movements', () => {
    expect(Object.keys(movementCatalog)).toHaveLength(151)
    expect(Object.values(movementCatalog).filter(isActiveMovement)).toHaveLength(140)
    expect(
      Object.values(movementCatalog)
        .filter((movement) => movement.status === 'deprecated')
        .map((movement) => movement.id)
        .sort(),
    ).toEqual([...deprecatedMovementIds].sort())
  })

  it('keeps deprecated ids resolvable with precise replacements', () => {
    expect(movementCatalog.chest_supported_row?.replacedByMovementId).toBe('chest_supported_dumbbell_row')
    expect(movementCatalog.split_squat?.replacedByMovementId).toBe('dumbbell_split_squat')
    expect(movementCatalog.side_bend?.replacedByMovementId).toBe('dumbbell_side_bend')
  })

  it('populates taxonomy metadata for every active movement', () => {
    for (const movement of Object.values(movementCatalog).filter(isActiveMovement)) {
      expect(movement.resistanceMode, movement.id).not.toBeNull()
      expect(movement.requiredEquipment.length, movement.id).toBeGreaterThan(0)
      expect(movement.pattern, movement.id).toBeTruthy()
      expect(movement.primaryMuscles.length, movement.id).toBeGreaterThan(0)
      expect(movement.loadConvention, movement.id).toBeTruthy()
    }
    expect(movementCatalog.deadlift?.pattern).toBe('hinge')
    expect(movementCatalog.overhead_press?.pattern).toBe('vertical_push')
    expect(movementCatalog.incline_dumbbell_press?.pattern).toBe(
      'horizontal_push',
    )
  })

  it('searches names and aliases and composes taxonomy filters', () => {
    expect(searchMovementCatalog('chest-supported row').map((movement) => movement.id)).toContain(
      'chest_supported_dumbbell_row',
    )
    const cableRows = filterMovementCatalog({
      resistanceModes: ['cable'],
      patterns: ['horizontal_pull'],
      muscles: ['upper_back'],
    })
    expect(cableRows.map((movement) => movement.id)).toContain('seated_cable_row')
    expect(cableRows.every(isActiveMovement)).toBe(true)
  })

  it('hides deprecated movements from custom builder options', () => {
    const optionIds = [
      ...variationMovementOptions,
      ...accessoryMovementOptions,
      ...loggerMovementOptions,
    ].map((movement) => movement.id)
    expect(optionIds).not.toContain('split_squat')
    expect(optionIds).not.toContain('chest_supported_row')

    const draftMovementIds = createDefaultCustomProgramBuilderInput({ daysPerWeek: 7 }).sessions
      .flatMap((session) => [
        session.mainMovementId,
        session.variationMovementId,
        ...session.accessories.map((accessory) => accessory.movementId),
      ])
      .filter((movementId): movementId is string => Boolean(movementId))
    expect(draftMovementIds.every((movementId) => isActiveMovement(movementCatalog[movementId]))).toBe(true)
  })
})

describe('free-weight policy v1', () => {
  it('orders the canonical alternative first for known machine and cable movements', () => {
    expect(freeWeightAlternativesFor('lat_pulldown')[0]?.id).toBe('pull_up')
    expect(freeWeightAlternativesFor('leg_press')[0]?.id).toBe('goblet_squat')
    expect(freeWeightAlternativesFor('hamstring_curl')[0]?.id).toBe('sliding_leg_curl')
    expect(freeWeightAlternativesFor('leg_extension')[0]?.id).toBe('goblet_squat')
    expect(freeWeightAlternativesFor('machine_chest_press')[0]?.id).toBe('dumbbell_bench_press')
    expect(freeWeightAlternativesFor('lat_pulldown').every(isFreeWeightMovement)).toBe(true)
  })

  it('exports a deterministic clear-load replacement policy', () => {
    expect(freeWeightPolicyV1).toMatchObject({
      id: '00000000-0000-4000-8000-000000000201',
      version: '1',
      checksum: 'd1a7e4203f2807c1a2ec9efe947d371e',
    })
    expect(freeWeightPolicyV1.rules.find((rule) => rule.sourceMovementId === 'lat_pulldown')).toMatchObject({
      replacementMovementIds: expect.arrayContaining(['pull_up']),
      loadHandling: 'clear',
    })
    expect(freeWeightPolicyV1.rules).toHaveLength(57)
    expect(
      freeWeightPolicyV1.rules.find(
        (rule) => rule.sourceMovementId === 'chest_supported_row',
      ),
    ).toMatchObject({
      replacementMovementIds: expect.arrayContaining([
        'chest_supported_dumbbell_row',
      ]),
    })
  })
})
