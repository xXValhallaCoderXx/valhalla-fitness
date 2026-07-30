import { describe, expect, it } from 'vitest'
import {
  defaultMovementReplacementRules,
  freeWeightPolicyV1,
  movementCatalog,
} from '../src/domains/movement/lib/movements'
import {
  applyEquipmentModeToSlot,
  buildActiveProgramEquipmentModePreview,
  buildSetupFreeWeightPreview,
  defaultFreeWeightChoice,
  freeWeightChoiceKey,
  resolveEquipmentModeMovement,
  resolveProgramMovementOverride,
} from '../src/domains/program/lib/equipment-mode'
import {
  freeWeightChoicesNeedReview,
  reconcileFreeWeightChoices,
} from '../src/domains/program/components/useTemplateStartEquipmentMode'
import { programAccessoryAdditionSlotId } from '../src/domains/program/lib/program-accessory-slots'
import type {
  FreeWeightChoiceDraft,
  ProgramInstance,
  ProgramSetupOptions,
  TemplateDefinition,
} from '../src/domains/program'
import type { MovementSlot } from '../src/domains/session'
import {
  listFallbackTemplateDefinitions,
  templateCatalog,
} from '../src/domains/program/lib/templates'
import { buildProgramSetupOptions } from '../src/domains/program/server/program-setup'
import { expandSessionFromTemplateDefinition } from '../src/domains/program/lib/template-engine'

const slotIdentity = {
  templateSessionId: 'pull-day',
  slotId: 'slot-pull-day-primary',
  phaseKey: 'base',
  role: 'variation' as const,
}

function policyChoice(
  sourceMovementId: string,
  replacementMovementId?: string,
  identity = slotIdentity,
): FreeWeightChoiceDraft {
  const rule = freeWeightPolicyV1.rules.find(
    (candidate) => candidate.sourceMovementId === sourceMovementId,
  )
  if (!rule) throw new Error(`Missing fixture policy rule for ${sourceMovementId}`)
  return {
    ...identity,
    sourceMovementId,
    replacementMovementId:
      replacementMovementId ?? rule.replacementMovementIds[0],
    policyRuleId: rule.id,
  }
}

describe('equipment-mode movement resolution', () => {
  it('uses deterministic, distinct identities for duplicate accessory additions', () => {
    const first = programAccessoryAdditionSlotId(
      'pull-day',
      1,
      'seated_cable_row',
    )
    const second = programAccessoryAdditionSlotId(
      'pull-day',
      2,
      'seated_cable_row',
    )

    expect(first).toBe(
      'slot-pull-day-added-accessory-1-seated_cable_row',
    )
    expect(second).toBe(
      'slot-pull-day-added-accessory-2-seated_cable_row',
    )
    expect(first).not.toBe(second)
  })

  it('normalizes duplicate override identity with last-write precedence', () => {
    expect(
      resolveProgramMovementOverride(
        [
          {
            slotId: slotIdentity.slotId,
            phaseKey: slotIdentity.phaseKey,
            role: slotIdentity.role,
            originalMovementId: 'lat_pulldown',
            replacementMovementId: 'pull_up',
            effectiveFromWeekIndex: 0,
          },
          {
            slotId: slotIdentity.slotId,
            phaseKey: slotIdentity.phaseKey,
            role: slotIdentity.role,
            originalMovementId: 'lat_pulldown',
            replacementMovementId: 'machine_row',
            effectiveFromWeekIndex: 0,
          },
        ],
        {
          slotId: slotIdentity.slotId,
          phaseKey: slotIdentity.phaseKey,
          role: slotIdentity.role,
          movementId: 'lat_pulldown',
          currentWeekIndex: 0,
        },
      ),
    ).toBe('machine_row')
  })

  it('passes the prescribed movement through in standard mode', () => {
    expect(
      resolveEquipmentModeMovement({
        program: {
          equipmentMode: 'standard',
          equipmentModeChoices: [],
        },
        ...slotIdentity,
        sourceMovementId: 'lat_pulldown',
      }),
    ).toEqual({ movementId: 'lat_pulldown' })
  })

  it('passes an eligible movement through in free-weight mode without a choice', () => {
    expect(
      resolveEquipmentModeMovement({
        program: {
          equipmentMode: 'free_weight',
          equipmentModeChoices: [],
        },
        ...slotIdentity,
        sourceMovementId: 'dumbbell_bench_press',
      }),
    ).toEqual({ movementId: 'dumbbell_bench_press' })
  })

  it('returns the curated replacement with its policy provenance', () => {
    const choice = policyChoice('lat_pulldown', 'pull_up')

    expect(
      resolveEquipmentModeMovement({
        program: {
          equipmentMode: 'free_weight',
          equipmentModeChoices: [choice],
        },
        ...slotIdentity,
        sourceMovementId: 'lat_pulldown',
      }),
    ).toEqual({
      movementId: 'pull_up',
      adaptation: {
        mode: 'free_weight',
        sourceMovementId: 'lat_pulldown',
        policyRuleId: choice.policyRuleId,
        loadReset: true,
      },
    })
  })

  it('skips policy targets that are no longer active in the supplied catalog', () => {
    const catalog = {
      ...movementCatalog,
      pull_up: {
        ...movementCatalog.pull_up,
        status: 'deprecated' as const,
      },
    }

    expect(
      defaultFreeWeightChoice({
        policy: freeWeightPolicyV1,
        ...slotIdentity,
        sourceMovementId: 'lat_pulldown',
        catalog,
      })?.replacementMovementId,
    ).toBe('dumbbell_pullover')
  })

  it('clears target and actual loads while preserving reps and other set data', () => {
    const choice = policyChoice('lat_pulldown', 'pull_up')
    const { adaptation } = resolveEquipmentModeMovement({
      program: {
        equipmentMode: 'free_weight',
        equipmentModeChoices: [choice],
      },
      ...slotIdentity,
      sourceMovementId: 'lat_pulldown',
    })
    const slot: MovementSlot = {
      id: slotIdentity.slotId,
      slotId: slotIdentity.slotId,
      phaseKey: slotIdentity.phaseKey,
      movementId: 'pull_up',
      movementName: 'Pull-up',
      role: slotIdentity.role,
      orderIndex: 1,
      targetSummary: '3 × 8',
      sets: [
        {
          id: 'set-1',
          setIndex: 0,
          targetLoad: 70,
          targetReps: 8,
          actualLoad: 65,
          actualReps: 7,
          actualRir: 2,
          completed: true,
          note: 'Controlled eccentric',
        },
      ],
    }

    const adapted = applyEquipmentModeToSlot(slot, adaptation)

    expect(adapted.modeAdaptation).toEqual(adaptation)
    expect(adapted.sets[0]).toMatchObject({
      targetLoad: null,
      actualLoad: null,
      targetReps: 8,
      actualReps: 7,
      actualRir: 2,
      completed: true,
      note: 'Controlled eccentric',
    })
    expect(slot.sets[0]).toMatchObject({
      targetLoad: 70,
      actualLoad: 65,
    })
  })

  it.each([
    {
      label: 'missing',
      choices: [],
    },
    {
      label: 'stale source',
      choices: [
        policyChoice('machine_chest_press', 'dumbbell_bench_press'),
      ],
    },
    {
      label: 'ineligible replacement',
      choices: [
        {
          ...policyChoice('lat_pulldown', 'pull_up'),
          replacementMovementId: 'seated_cable_row',
        },
      ],
    },
  ])('fails closed for a $label choice', ({ choices }) => {
    expect(() =>
      resolveEquipmentModeMovement({
        program: {
          equipmentMode: 'free_weight',
          equipmentModeChoices: choices,
        },
        ...slotIdentity,
        sourceMovementId: 'lat_pulldown',
      }),
    ).toThrow('FREE_WEIGHT_CHOICE_STALE')
  })

  it('uses the complete session, phase, slot, and role identity', () => {
    const basePrimary = policyChoice('lat_pulldown', 'pull_up')
    const peakPrimary = policyChoice('lat_pulldown', 'chin_up', {
      ...slotIdentity,
      phaseKey: 'peak',
    })
    const baseSecondary = policyChoice('lat_pulldown', 'dumbbell_pullover', {
      ...slotIdentity,
      slotId: 'slot-pull-day-secondary',
    })

    const program = {
      equipmentMode: 'free_weight' as const,
      equipmentModeChoices: [
        baseSecondary,
        peakPrimary,
        basePrimary,
      ],
    }

    expect(
      resolveEquipmentModeMovement({
        program,
        ...slotIdentity,
        sourceMovementId: 'lat_pulldown',
      }).movementId,
    ).toBe('pull_up')
    expect(
      resolveEquipmentModeMovement({
        program,
        ...slotIdentity,
        phaseKey: 'peak',
        sourceMovementId: 'lat_pulldown',
      }).movementId,
    ).toBe('chin_up')
    expect(
      resolveEquipmentModeMovement({
        program,
        ...slotIdentity,
        slotId: 'slot-pull-day-secondary',
        sourceMovementId: 'lat_pulldown',
      }).movementId,
    ).toBe('dumbbell_pullover')
  })
})

describe('equipment-mode previews', () => {
  it('requires explicit review when reconciliation introduces a new source choice', () => {
    const expectedChoice = policyChoice('lat_pulldown', 'pull_up')
    const previouslyReviewedChoice = policyChoice(
      'machine_chest_press',
      'dumbbell_bench_press',
    )
    const preview: ReturnType<typeof buildSetupFreeWeightPreview> = {
      choices: [expectedChoice],
      changes: [
        {
          choice: expectedChoice,
          sessionTitle: 'Pull day',
          phaseLabel: 'Base phase',
          sourceMovementName: 'Lat pulldown',
          replacementMovementName: 'Pull-up',
          alternatives: [
            {
              movementId: expectedChoice.replacementMovementId,
              movementName: 'Pull-up',
              policyRuleId: expectedChoice.policyRuleId,
            },
          ],
        },
      ],
      unresolved: [],
      canApply: true,
    }

    const reconciled = reconcileFreeWeightChoices(preview, [
      previouslyReviewedChoice,
    ])

    expect(reconciled).toEqual([expectedChoice])
    expect(
      freeWeightChoicesNeedReview({
        preview,
        choices: reconciled,
        reviewedChoices: [previouslyReviewedChoice],
      }),
    ).toBe(true)
    expect(
      freeWeightChoicesNeedReview({
        preview,
        choices: reconciled,
        reviewedChoices: reconciled,
      }),
    ).toBe(false)
  })

  it('does not keep review dirty after the affected row is removed', () => {
    const previouslyReviewedChoice = policyChoice(
      'lat_pulldown',
      'pull_up',
    )
    const preview: ReturnType<typeof buildSetupFreeWeightPreview> = {
      choices: [],
      changes: [],
      unresolved: [],
      canApply: true,
    }

    expect(
      freeWeightChoicesNeedReview({
        preview,
        choices: [],
        reviewedChoices: [previouslyReviewedChoice],
      }),
    ).toBe(false)
  })

  it('covers every built-in template, including deprecated pinned aliases', () => {
    for (const definition of listFallbackTemplateDefinitions()) {
      const template = templateCatalog.find(
        (candidate) => candidate.id === definition.id,
      )
      if (!template) {
        throw new Error(`Missing template summary for ${definition.id}`)
      }
      const setupOptions = buildProgramSetupOptions({
        template,
        definition,
        catalog: movementCatalog,
        rules: defaultMovementReplacementRules,
        freeWeightPolicy: freeWeightPolicyV1,
      })
      const preview = buildSetupFreeWeightPreview({
        setupOptions,
        movementOverrides: [],
        accessoryAdditions: [],
      })

      expect(
        preview.unresolved,
        `${definition.id} has unmapped free-weight movements`,
      ).toEqual([])
      expect(preview.canApply).toBe(true)
    }
  })

  it('resolves setup-time manual overrides and accessory additions', () => {
    const setupOptions: ProgramSetupOptions = {
      templateId: 'template-1',
      templateName: 'Fixture programme',
      origin: 'system_default',
      freeWeightPolicy: freeWeightPolicyV1,
      sessions: [
        {
          id: 'pull-day',
          title: 'Pull day',
          slots: [],
          accessoryPrescriptions: [],
        },
      ],
      previewWeeks: [
        {
          index: 0,
          label: 'Week 1',
          phaseKey: 'base',
          phaseLabel: 'Base phase',
          subtitle: 'Base',
          summary: 'Build',
          hardness: 'Medium',
          sessions: [
            {
              id: 'pull-day',
              label: 'Day 1',
              title: 'Pull day',
              estimatedMinutes: 45,
              movementSummary: 'Lat pulldown',
              keyPrescription: '3 × 8',
              movements: [
                {
                  slotId: 'slot-pull-day-primary',
                  templateSlotId: 'primary',
                  phaseKey: 'base',
                  phaseLabel: 'Base phase',
                  setupPhaseKey: 'base',
                  role: 'variation',
                  roleLabel: 'Variation',
                  defaultMovementId: 'lat_pulldown',
                  defaultMovementName: 'Lat pulldown',
                  targetSummary: '3 × 8',
                  replacementOptions: [],
                },
              ],
            },
          ],
        },
      ],
      accessoryCatalog: [],
    }

    const preview = buildSetupFreeWeightPreview({
      setupOptions,
      movementOverrides: [
        {
          slotId: 'slot-pull-day-primary',
          phaseKey: 'base',
          role: 'variation',
          originalMovementId: 'lat_pulldown',
          replacementMovementId: 'machine_chest_press',
        },
      ],
      accessoryAdditions: [
        {
          sessionId: 'pull-day',
          sourceSlotId: 'primary',
          movementId: 'seated_cable_row',
          phaseKey: '*',
        },
      ],
    })

    expect(preview.canApply).toBe(true)
    expect(preview.unresolved).toEqual([])
    expect(preview.changes).toHaveLength(2)
    expect(
      preview.changes.map(({ choice }) => ({
        source: choice.sourceMovementId,
        replacement: choice.replacementMovementId,
        slotId: choice.slotId,
      })),
    ).toEqual(
      expect.arrayContaining([
        {
          source: 'machine_chest_press',
          replacement: 'dumbbell_bench_press',
          slotId: 'slot-pull-day-primary',
        },
        {
          source: 'seated_cable_row',
          replacement: 'barbell_row',
          slotId:
            'slot-pull-day-added-accessory-1-seated_cable_row',
        },
      ]),
    )
  })

  it('keeps saved choices available across a reversible active-program mode change', () => {
    const definition: TemplateDefinition = {
      schemaVersion: '2026.06.dsl',
      id: 'template-1',
      name: 'Fixture programme',
      durationWeeks: 1,
      daysPerWeek: 1,
      requiredState: [],
      timelineDescription: 'Fixture',
      sessions: [
        {
          id: 'pull-day',
          title: 'Pull day',
          estimatedMinutes: 45,
          slots: [
            {
              id: 'primary',
              role: 'variation',
              movementId: 'lat_pulldown',
              prescriptionId: 'work',
            },
          ],
        },
      ],
      weeks: [
        {
          label: 'Week 1',
          phaseKey: 'base',
          phaseLabel: 'Base phase',
          summary: 'Build',
          hardness: 'Medium',
          prescriptions: {
            work: {
              targetSummary: '3 × 8',
              sets: [{ targetReps: 8 }],
            },
          },
        },
      ],
    }
    const savedChoice = policyChoice('lat_pulldown', 'chin_up')
    const program: ProgramInstance = {
      id: 'program-1',
      templateId: definition.id,
      templateVersionId: 'template-version-1',
      title: definition.name,
      status: 'active',
      startDate: '2026-07-30',
      units: 'kg',
      rounding: 2.5,
      currentWeekIndex: 0,
      stateVersion: 4,
      equipmentMode: 'free_weight',
      freeWeightPolicyVersionId: freeWeightPolicyV1.id,
      freeWeightChoicesHash: freeWeightPolicyV1.checksum,
      customizationStatus: 'default',
      customizationSummary: {
        movementOverrideCount: 0,
        accessoryAdditionCount: 0,
      },
      stateValues: [],
      equipmentModeChoices: [savedChoice],
      templateDefinition: definition,
    }

    const standardPreview = buildActiveProgramEquipmentModePreview({
      program,
      targetMode: 'standard',
      policy: null,
    })
    expect(standardPreview).toMatchObject({
      currentMode: 'free_weight',
      targetMode: 'standard',
      canApply: true,
    })
    expect(program.equipmentModeChoices).toEqual([savedChoice])

    const restoredPreview = buildActiveProgramEquipmentModePreview({
      program: {
        ...program,
        equipmentMode: 'standard',
      },
      targetMode: 'free_weight',
      policy: freeWeightPolicyV1,
    })
    expect(restoredPreview.changes).toHaveLength(1)
    expect(restoredPreview.changes[0]).toMatchObject({
      ...slotIdentity,
      sourceMovementId: 'lat_pulldown',
      replacementMovementId: 'chin_up',
      selectionState: 'saved',
    })
    expect(
      freeWeightChoiceKey(restoredPreview.changes[0]),
    ).toBe(freeWeightChoiceKey(savedChoice))
  })

  it('gives an exact phase override precedence over an older wildcard', () => {
    const definition: TemplateDefinition = {
      schemaVersion: '2026.06.dsl',
      id: 'override-template',
      name: 'Override fixture',
      durationWeeks: 2,
      daysPerWeek: 1,
      requiredState: [],
      timelineDescription: 'Fixture',
      sessions: [
        {
          id: 'pull-day',
          title: 'Pull day',
          estimatedMinutes: 45,
          slots: [
            {
              id: 'primary',
              role: 'accessory',
              movementId: 'lat_pulldown',
              prescriptionId: 'work',
            },
          ],
        },
      ],
      weeks: [
        {
          label: 'Week 1',
          phaseKey: 'base',
          phaseLabel: 'Base phase',
          summary: 'Build',
          hardness: 'Medium',
          prescriptions: {
            work: {
              targetSummary: '3 × 8',
              sets: [{ targetReps: 8 }],
            },
          },
        },
        {
          label: 'Week 2',
          phaseKey: 'peak',
          phaseLabel: 'Peak phase',
          summary: 'Peak',
          hardness: 'Hard',
          prescriptions: {
            work: {
              targetSummary: '3 × 6',
              sets: [{ targetReps: 6 }],
            },
          },
        },
      ],
    }
    const baseProgram: ProgramInstance = {
      id: 'program-override',
      templateId: definition.id,
      templateVersionId: 'version-override',
      title: definition.name,
      status: 'active',
      startDate: '2026-07-30',
      units: 'kg',
      rounding: 2.5,
      currentWeekIndex: 0,
      stateVersion: 1,
      equipmentMode: 'standard',
      customizationStatus: 'customized',
      customizationSummary: {
        movementOverrideCount: 2,
        accessoryAdditionCount: 0,
      },
      stateValues: [],
      movementOverrides: [
        {
          slotId: 'slot-pull-day-primary',
          phaseKey: '*',
          role: 'accessory',
          originalMovementId: 'lat_pulldown',
          replacementMovementId: 'machine_row',
          effectiveFromWeekIndex: 0,
        },
        {
          slotId: 'slot-pull-day-primary',
          phaseKey: 'peak',
          role: 'accessory',
          originalMovementId: 'lat_pulldown',
          replacementMovementId: 'seated_cable_row',
          effectiveFromWeekIndex: 1,
        },
      ],
      accessoryAdditions: [
        {
          sessionId: 'pull-day',
          slotId: 'future-core',
          phaseKey: 'peak',
          movementId: 'cable_crunch',
          prescriptionId: 'work',
          effectiveFromWeekIndex: 1,
          orderIndex: 1,
        },
      ],
      templateDefinition: definition,
    }

    expect(
      expandSessionFromTemplateDefinition(
        baseProgram,
        definition,
        '2026-07-30',
      ).movements[0]?.movementId,
    ).toBe('machine_row')
    expect(
      expandSessionFromTemplateDefinition(
        { ...baseProgram, currentWeekIndex: 1 },
        definition,
        '2026-08-06',
      ).movements[0]?.movementId,
    ).toBe('seated_cable_row')

    const preview = buildActiveProgramEquipmentModePreview({
      program: baseProgram,
      targetMode: 'free_weight',
      policy: freeWeightPolicyV1,
    })
    expect(
      preview.changes.find((change) => change.phaseKey === 'base')
        ?.sourceMovementId,
    ).toBe('machine_row')
    expect(
      preview.changes.find((change) => change.phaseKey === 'peak')
        ?.sourceMovementId,
    ).toBe('seated_cable_row')
    expect(
      preview.changes.find(
        (change) =>
          change.phaseKey === 'peak' &&
          change.slotId === 'slot-pull-day-future-core',
      )?.sourceMovementId,
    ).toBe('cable_crunch')

    const freeProgram: ProgramInstance = {
      ...baseProgram,
      currentWeekIndex: 1,
      equipmentMode: 'free_weight',
      equipmentModeChoices: preview.changes.map(
        ({
          templateSessionId,
          slotId,
          phaseKey,
          role,
          sourceMovementId,
          replacementMovementId,
          policyRuleId,
        }) => ({
          templateSessionId,
          slotId,
          phaseKey,
          role,
          sourceMovementId,
          replacementMovementId,
          policyRuleId,
        }),
      ),
    }
    expect(() =>
      expandSessionFromTemplateDefinition(
        freeProgram,
        definition,
        '2026-08-06',
      ),
    ).not.toThrow()
    expect(
      expandSessionFromTemplateDefinition(
        freeProgram,
        definition,
        '2026-08-06',
      ).movements.every((movement) =>
        ['seated_cable_row', 'cable_crunch'].every(
          (machineId) => movement.movementId !== machineId,
        ),
      ),
    ).toBe(true)
  })
})
