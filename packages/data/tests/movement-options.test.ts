import { describe, expect, it } from 'vitest'
import {
  listAccessoryMovementOptions,
  listMovementOptions,
} from '@sheetless/data/movement/catalog'
import { makeStubCtx, type TestRow } from './support/supabase-stub'

function movementRow(
  id: string,
  name: string,
  options: Partial<TestRow> = {},
): TestRow {
  return {
    id,
    name,
    category: 'upper',
    equipment: ['barbell'],
    variation_of: null,
    default_unit: 'kg',
    is_competition: false,
    status: 'active',
    resistance_mode: 'barbell',
    required_equipment: ['barbell'],
    pattern: 'horizontal_push',
    primary_muscles: ['chest'],
    secondary_muscles: ['triceps'],
    aliases: [],
    load_convention: 'total_external',
    replaced_by_movement_id: null,
    canonical_free_weight_movement_id: null,
    ...options,
  }
}

describe('movement option lists', () => {
  it('returns active non-competition accessories alphabetically', async () => {
    const { ctx } = makeStubCtx({
      movements: [
        movementRow('bench_press', 'Bench Press', { is_competition: true }),
        movementRow('triceps_extension', 'Triceps Extension', {
          equipment: ['cable'],
          resistance_mode: 'cable',
          required_equipment: ['cable'],
        }),
        movementRow('chest_fly', 'Chest Fly', {
          equipment: ['dumbbell'],
          resistance_mode: 'dumbbell',
          required_equipment: ['dumbbells'],
        }),
        movementRow('retired_press', 'Retired Press', { status: 'deprecated' }),
      ],
    })

    const options = await listAccessoryMovementOptions(ctx)

    expect(options.map((option) => option.movementId)).toEqual([
      'chest_fly',
      'triceps_extension',
    ])
    expect(options[0]).toMatchObject({
      movementName: 'Chest Fly',
      defaultUnit: 'kg',
      freeWeightCompatible: true,
      requiredEquipment: ['dumbbells'],
    })
    expect(options[1]).toMatchObject({
      freeWeightCompatible: false,
      requiredEquipment: ['cable'],
    })
  })

  it('includes competition lifts first in the full ad-hoc catalogue', async () => {
    const { ctx } = makeStubCtx({
      movements: [
        movementRow('cable_row', 'Cable Row', {
          equipment: ['cable'],
          resistance_mode: 'cable',
          required_equipment: ['cable'],
          pattern: 'horizontal_pull',
        }),
        movementRow('squat', 'Squat', {
          category: 'lower',
          is_competition: true,
          pattern: 'squat',
          primary_muscles: ['quads'],
          secondary_muscles: ['glutes'],
        }),
        movementRow('bench_press', 'Bench Press', { is_competition: true }),
      ],
    })

    const options = await listMovementOptions(ctx)

    expect(options.map((option) => option.movementId)).toEqual([
      'bench_press',
      'squat',
      'cable_row',
    ])
    expect(options.map((option) => option.requiredEquipment)).toEqual([
      ['barbell'],
      ['barbell'],
      ['cable'],
    ])
  })
})
