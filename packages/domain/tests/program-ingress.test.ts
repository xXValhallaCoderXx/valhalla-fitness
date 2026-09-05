import { describe, expect, it } from 'vitest'
import {
  parseFreeWeightPolicyDefinition,
  setProgramEquipmentModeInputSchema,
  startProgramInputSchema,
} from '@sheetless/domain/program/schemas'

const policyVersionId = '00000000-0000-4000-8000-000000000201'
const programId = 'f93f3498-4d9c-4ec3-93ef-7520f8971c19'
const policyChecksum = 'd1a7e4203f2807c1a2ec9efe947d371e'

const freeWeightChoice = {
  templateSessionId: 'pull-day',
  slotId: 'slot-pull-day-primary',
  phaseKey: 'base',
  role: 'variation' as const,
  sourceMovementId: 'lat_pulldown',
  replacementMovementId: 'pull_up',
  policyRuleId: 'free-weight-v1-lat_pulldown',
}

const freeWeightPolicyDefinition = {
  rules: [
    {
      id: 'free-weight-v1-lat_pulldown',
      sourceMovementId: 'lat_pulldown',
      replacementMovementIds: ['pull_up', 'chin_up'],
      loadHandling: 'clear' as const,
    },
  ],
}

describe('programme lifecycle ingress', () => {
  it('rejects unsafe programme template identities', () => {
    expect(
      startProgramInputSchema.safeParse({
        requestId: 'start-1',
        templateId: 'template-1,origin.eq.user_created',
      }).success,
    ).toBe(false)
  })

  it('requires mode-specific policy fields together', () => {
    expect(
      startProgramInputSchema.safeParse({
        requestId: 'start-1',
        templateId: 'template-1',
        equipmentMode: 'free_weight',
      }).success,
    ).toBe(false)
    expect(
      startProgramInputSchema.safeParse({
        requestId: 'start-1',
        templateId: 'template-1',
        equipmentMode: 'standard',
        freeWeightPolicyVersionId: policyVersionId,
      }).success,
    ).toBe(false)
    expect(
      setProgramEquipmentModeInputSchema.safeParse({
        programId,
        targetMode: 'free_weight',
        expectedStateVersion: 2,
        freeWeightPolicyVersionId: policyVersionId,
        freeWeightPolicyChecksum: policyChecksum,
      }).success,
    ).toBe(false)
    expect(
      setProgramEquipmentModeInputSchema.safeParse({
        programId,
        targetMode: 'standard',
        expectedStateVersion: 2,
        freeWeightChoices: [],
      }).success,
    ).toBe(false)

    expect(
      startProgramInputSchema.parse({
        requestId: 'start-1',
        templateId: 'template-1',
        equipmentMode: 'free_weight',
        freeWeightPolicyVersionId: policyVersionId,
        freeWeightPolicyChecksum: policyChecksum,
        freeWeightChoices: [freeWeightChoice],
      }),
    ).toMatchObject({ equipmentMode: 'free_weight' })
  })

  it('rejects duplicate state, override, and free-weight choice identities', () => {
    expect(
      startProgramInputSchema.safeParse({
        requestId: 'start-1',
        templateId: 'template-1',
        stateValues: [
          {
            key: 'squat_training_max',
            movementId: 'squat',
            type: 'training_max',
            value: 100,
          },
          {
            key: 'squat_training_max',
            movementId: 'squat',
            type: 'training_max',
            value: 105,
          },
        ],
      }).success,
    ).toBe(false)

    const movementOverride = {
      slotId: 'slot-pull-day-primary',
      phaseKey: 'base',
      role: 'variation' as const,
      originalMovementId: 'lat_pulldown',
      replacementMovementId: 'pull_up',
    }
    expect(
      startProgramInputSchema.safeParse({
        requestId: 'start-1',
        templateId: 'template-1',
        movementOverrides: [
          movementOverride,
          { ...movementOverride, replacementMovementId: 'chin_up' },
        ],
      }).success,
    ).toBe(false)

    expect(
      setProgramEquipmentModeInputSchema.safeParse({
        programId,
        targetMode: 'free_weight',
        expectedStateVersion: 2,
        freeWeightPolicyVersionId: policyVersionId,
        freeWeightPolicyChecksum: policyChecksum,
        freeWeightChoices: [
          freeWeightChoice,
          { ...freeWeightChoice, replacementMovementId: 'chin_up' },
        ],
      }).success,
    ).toBe(false)
  })

  it('continues to allow duplicate accessory additions as distinct ordered slots', () => {
    const accessory = {
      sessionId: 'pull-day',
      sourceSlotId: 'accessory-1',
      movementId: 'dumbbell_curl',
    }

    expect(
      startProgramInputSchema.safeParse({
        requestId: 'start-1',
        templateId: 'template-1',
        accessoryAdditions: [accessory, accessory],
      }).success,
    ).toBe(true)
  })
})

describe('free-weight policy definition parsing', () => {
  it('parses the strict stored policy shape', () => {
    expect(parseFreeWeightPolicyDefinition(freeWeightPolicyDefinition)).toEqual(
      freeWeightPolicyDefinition.rules,
    )
  })

  it.each([
    ['legacy array shape', freeWeightPolicyDefinition.rules],
    ['unknown definition field', { ...freeWeightPolicyDefinition, internal: true }],
    [
      'unknown rule field',
      {
        rules: [
          { ...freeWeightPolicyDefinition.rules[0], internal: true },
        ],
      },
    ],
    [
      'unsupported load handling',
      {
        rules: [
          { ...freeWeightPolicyDefinition.rules[0], loadHandling: 'preserve' },
        ],
      },
    ],
    [
      'duplicate rule id',
      {
        rules: [
          freeWeightPolicyDefinition.rules[0],
          {
            ...freeWeightPolicyDefinition.rules[0],
            sourceMovementId: 'machine_row',
          },
        ],
      },
    ],
    [
      'duplicate source movement',
      {
        rules: [
          freeWeightPolicyDefinition.rules[0],
          {
            ...freeWeightPolicyDefinition.rules[0],
            id: 'free-weight-v1-lat_pulldown-alternate',
          },
        ],
      },
    ],
    [
      'duplicate replacement',
      {
        rules: [
          {
            ...freeWeightPolicyDefinition.rules[0],
            replacementMovementIds: ['pull_up', 'pull_up'],
          },
        ],
      },
    ],
    [
      'source as replacement',
      {
        rules: [
          {
            ...freeWeightPolicyDefinition.rules[0],
            replacementMovementIds: ['lat_pulldown'],
          },
        ],
      },
    ],
    [
      'normalization-dependent identifier',
      {
        rules: [
          {
            ...freeWeightPolicyDefinition.rules[0],
            id: ' free-weight-v1-lat_pulldown ',
          },
        ],
      },
    ],
  ])('rejects %s', (_name, definition) => {
    expect(() => parseFreeWeightPolicyDefinition(definition)).toThrow()
  })
})
