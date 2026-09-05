import { describe, expect, it } from 'vitest'
import {
  resolveProgressionDecision,
  resolveProgressionDecisions,
} from '@sheetless/data/program/active-program'
import {
  previewProgramEquipmentMode,
  setProgramEquipmentMode,
} from '@sheetless/data/program/equipment-mode'
import { startProgram } from '@sheetless/data/program/start'
import { getProgramSetupOptions } from '@sheetless/data/program/templates'
import {
  addSessionAccessory,
  removeSessionAccessory,
  reorderSessionAccessories,
} from '@sheetless/data/session/accessories'
import {
  addAdHocExercise,
  removeAdHocExercise,
} from '@sheetless/data/session/ad-hoc-exercises'
import {
  listMovementSwapOptions,
  substituteMovement,
} from '@sheetless/data/session/movements'
import { finishSession } from '@sheetless/data/session/completion'
import { setSessionFavorite } from '@sheetless/data/session/favorites'
import { renameSession, startAdHocSession } from '@sheetless/data/session/lifecycle'
import { addExerciseSet, upsertSetLog } from '@sheetless/data/session/sets'
import type { UserContext } from '@sheetless/data/shared/context'
import { makeStubCtx } from './support/supabase-stub'

const sessionId = 'f93f3498-4d9c-4ec3-93ef-7520f8971c19'
const exerciseLogId = 'ffbe42d8-86d7-4714-88d5-8599fc5183d3'
const decisionId = '805dfe37-3600-48c2-bac4-a8f415460a05'

function movementRow(id: string, status: 'active' | 'deprecated') {
  return {
    id,
    name: 'Retired movement',
    category: 'upper',
    equipment: ['barbell'],
    variation_of: null,
    default_unit: 'kg',
    is_competition: false,
    status,
    resistance_mode: 'barbell',
    required_equipment: ['barbell'],
    pattern: 'horizontal_push',
    primary_muscles: ['chest'],
    secondary_muscles: ['triceps'],
    aliases: [],
    load_convention: 'total_external',
    replaced_by_movement_id: null,
    canonical_free_weight_movement_id: null,
  }
}

type IngressCase = {
  name: string
  run: (ctx: UserContext) => Promise<unknown>
}

const overpostedCases: IngressCase[] = [
  {
    name: 'movement swap options',
    run: (ctx) => listMovementSwapOptions(ctx, {
      sessionId,
      exerciseLogId,
      unexpected: true,
    } as never),
  },
  {
    name: 'movement substitution',
    run: (ctx) => substituteMovement(ctx, {
      sessionId,
      exerciseLogId,
      performedMovementId: 'dumbbell_bench_press',
      reason: 'preference',
      scope: 'session',
      requestId: 'swap-1',
      expectedStateVersion: 1,
      unexpected: true,
    } as never),
  },
  {
    name: 'accessory addition',
    run: (ctx) => addSessionAccessory(ctx, {
      sessionId,
      movementId: 'cable_row',
      progressionMethod: 'history_only',
      repTarget: '8-12',
      scope: 'session',
      clientMutationId: 'add-accessory-1',
      expectedStateVersion: 1,
      unexpected: true,
    } as never),
  },
  {
    name: 'accessory removal',
    run: (ctx) => removeSessionAccessory(ctx, {
      sessionId,
      exerciseLogId,
      scope: 'session',
      requestId: 'remove-accessory-1',
      expectedStateVersion: 1,
      unexpected: true,
    } as never),
  },
  {
    name: 'accessory reorder',
    run: (ctx) => reorderSessionAccessories(ctx, {
      sessionId,
      orderedSlotIds: ['slot-1'],
      requestId: 'reorder-accessories-1',
      expectedStateVersion: 1,
      unexpected: true,
    } as never),
  },
  {
    name: 'ad-hoc exercise addition',
    run: (ctx) => addAdHocExercise(ctx, {
      sessionId,
      movementId: 'cable_row',
      clientMutationId: 'add-exercise-1',
      expectedStateVersion: 1,
      unexpected: true,
    } as never),
  },
  {
    name: 'ad-hoc exercise removal',
    run: (ctx) => removeAdHocExercise(ctx, {
      sessionId,
      exerciseLogId,
      requestId: 'remove-exercise-1',
      expectedStateVersion: 1,
      unexpected: true,
    } as never),
  },
  {
    name: 'exercise set addition',
    run: (ctx) => addExerciseSet(ctx, {
      sessionId,
      exerciseLogId,
      clientMutationId: 'add-set-1',
      expectedStateVersion: 1,
      unexpected: true,
    } as never),
  },
  {
    name: 'set log upsert',
    run: (ctx) => upsertSetLog(ctx, {
      sessionId,
      exerciseLogId,
      setIndex: 0,
      actualLoad: 100,
      clientMutationId: 'upsert-set-1',
      expectedStateVersion: 1,
      unexpected: true,
    } as never),
  },
  {
    name: 'session finish',
    run: (ctx) => finishSession(ctx, {
      sessionId,
      requestId: 'finish-1',
      notes: null,
      sessionRpe: null,
      reflectionWin: null,
      reflectionImprove: null,
      unexpected: true,
    } as never),
  },
  {
    name: 'ad-hoc session start',
    run: (ctx) => startAdHocSession(ctx, {
      clientMutationId: 'start-ad-hoc-1',
      unexpected: true,
    } as never),
  },
  {
    name: 'session rename',
    run: (ctx) => renameSession(ctx, {
      sessionId,
      title: 'Push day',
      requestId: 'rename-1',
      expectedStateVersion: 1,
      unexpected: true,
    } as never),
  },
  {
    name: 'session favourite',
    run: (ctx) => setSessionFavorite(ctx, {
      sessionId,
      favorite: true,
      title: 'Push day',
      unexpected: true,
    } as never),
  },
  {
    name: 'single progression resolution',
    run: (ctx) => resolveProgressionDecision(ctx, {
      decisionId,
      action: 'accepted',
      requestId: 'resolve-1',
      unexpected: true,
    } as never),
  },
  {
    name: 'bulk progression resolution',
    run: (ctx) => resolveProgressionDecisions(ctx, {
      decisionIds: [decisionId],
      action: 'dismissed',
      requestId: 'resolve-all-1',
      unexpected: true,
    } as never),
  },
]

const malformedAdHocCases: IngressCase[] = [
  {
    name: 'ad-hoc session source',
    run: (ctx) => startAdHocSession(ctx, {
      clientMutationId: 'start-ad-hoc-1',
      sourceSessionId: 'not-a-session-id',
    } as never),
  },
  {
    name: 'session rename title',
    run: (ctx) => renameSession(ctx, {
      sessionId,
      title: '   ',
      requestId: 'rename-1',
      expectedStateVersion: 1,
    }),
  },
  {
    name: 'favourite without a name',
    run: (ctx) => setSessionFavorite(ctx, {
      sessionId,
      favorite: true,
    } as never),
  },
]

describe('data mutation ingress validation', () => {
  for (const testCase of overpostedCases) {
    it(`rejects overposted ${testCase.name} input before database access`, async () => {
      const { ctx, stub } = makeStubCtx({})

      await expect(testCase.run(ctx)).rejects.toThrow()

      expect(stub.fromCalls).toEqual([])
      expect(stub.rpcCalls).toEqual([])
    })
  }

  for (const testCase of malformedAdHocCases) {
    it(`rejects malformed ${testCase.name} input before database access`, async () => {
      const { ctx, stub } = makeStubCtx({})

      await expect(testCase.run(ctx)).rejects.toThrow()

      expect(stub.fromCalls).toEqual([])
      expect(stub.rpcCalls).toEqual([])
    })
  }

  it('rejects malformed programme setup input before database access', async () => {
    const { ctx, stub } = makeStubCtx({})

    await expect(
      getProgramSetupOptions(ctx.supabase, {
        templateId: 'template-1',
        unexpected: true,
      } as never),
    ).rejects.toThrow()

    expect(stub.fromCalls).toEqual([])
    expect(stub.rpcCalls).toEqual([])
  })

  it('rejects malformed programme start input before profile or database access', async () => {
    const { ctx, stub } = makeStubCtx({})

    await expect(
      startProgram(ctx, {
        requestId: 'start-1',
        templateId: 'template-1',
        equipmentMode: 'free_weight',
      } as never),
    ).rejects.toThrow()

    expect(stub.fromCalls).toEqual([])
    expect(stub.rpcCalls).toEqual([])
  })

  it('rejects malformed equipment-mode preview input before database access', async () => {
    const { ctx, stub } = makeStubCtx({})

    await expect(
      previewProgramEquipmentMode(ctx, {
        programId: sessionId,
        targetMode: 'standard',
        unexpected: true,
      } as never),
    ).rejects.toThrow()

    expect(stub.fromCalls).toEqual([])
    expect(stub.rpcCalls).toEqual([])
  })

  it('rejects cross-field equipment-mode apply input before database access', async () => {
    const { ctx, stub } = makeStubCtx({})

    await expect(
      setProgramEquipmentMode(ctx, {
        programId: sessionId,
        targetMode: 'standard',
        expectedStateVersion: 1,
        freeWeightChoices: [],
      } as never),
    ).rejects.toThrow()

    expect(stub.fromCalls).toEqual([])
    expect(stub.rpcCalls).toEqual([])
  })

  it('rejects an invalid set log before database access', async () => {
    const { ctx, stub } = makeStubCtx({})

    await expect(upsertSetLog(ctx, {
      sessionId,
      exerciseLogId,
      setIndex: 0,
      actualLoad: -1,
      clientMutationId: 'upsert-set-1',
      expectedStateVersion: 1,
    })).rejects.toThrow()

    expect(stub.fromCalls).toEqual([])
    expect(stub.rpcCalls).toEqual([])
  })

  it('rejects duplicate accessory slots before database access', async () => {
    const { ctx, stub } = makeStubCtx({})

    await expect(reorderSessionAccessories(ctx, {
      sessionId,
      orderedSlotIds: ['slot-1', 'slot-1'],
      requestId: 'reorder-accessories-1',
      expectedStateVersion: 1,
    })).rejects.toThrow('Accessory order cannot contain duplicate slots.')

    expect(stub.fromCalls).toEqual([])
    expect(stub.rpcCalls).toEqual([])
  })

  it('rejects a machine movement in a free-weight ad-hoc workout', async () => {
    const { ctx, stub } = makeStubCtx({
      workout_sessions: [{
        id: sessionId,
        user_id: 'user-1',
        status: 'in_progress',
        state_version: 1,
        program_instance_id: null,
        prescription_snapshot: {
          id: 'ad-hoc-session',
          title: 'Free weights workout',
          equipmentMode: 'free_weight',
          movements: [],
        },
      }],
      exercise_logs: [],
      movements: [],
    })

    await expect(addAdHocExercise(ctx, {
      sessionId,
      movementId: 'seated_cable_row',
      clientMutationId: 'add-exercise-1',
      expectedStateVersion: 1,
    })).rejects.toThrow('Free weights only workouts require a free-weight exercise.')

    expect(stub.rpcCalls).toEqual([])
  })

  it('rejects an inactive movement in an ad-hoc workout', async () => {
    const { ctx, stub } = makeStubCtx({
      workout_sessions: [{
        id: sessionId,
        user_id: 'user-1',
        status: 'in_progress',
        state_version: 1,
        program_instance_id: null,
        prescription_snapshot: {
          id: 'ad-hoc-session',
          title: 'Workout',
          movements: [],
        },
      }],
      exercise_logs: [],
      movements: [movementRow('retired_press', 'deprecated')],
    })

    await expect(addAdHocExercise(ctx, {
      sessionId,
      movementId: 'retired_press',
      clientMutationId: 'add-exercise-1',
      expectedStateVersion: 1,
    })).rejects.toThrow('Movement is not available.')

    expect(stub.rpcCalls).toEqual([])
  })

  it('uses the parsed progression request ID in the RPC', async () => {
    const { ctx, stub } = makeStubCtx({
      progression_decisions: [
        {
          id: decisionId,
          user_id: 'user-1',
        },
      ],
    })

    await resolveProgressionDecisions(ctx, {
      decisionIds: [decisionId],
      action: 'accepted',
      requestId: '  resolve-all-1  ',
    })

    expect(stub.rpcCalls).toEqual([
      {
        fn: 'resolve_progression_decisions_v2',
        args: {
          p_decision_ids: [decisionId],
          p_action: 'accepted',
          p_request_id: 'resolve-all-1',
        },
      },
    ])
  })

  it('does not bulk-resolve another user\'s progression decision', async () => {
    const { ctx, stub } = makeStubCtx({
      progression_decisions: [
        {
          id: decisionId,
          user_id: 'user-2',
        },
      ],
    })

    await expect(resolveProgressionDecisions(ctx, {
      decisionIds: [decisionId],
      action: 'dismissed',
      requestId: 'resolve-all-1',
    })).rejects.toThrow('Progression decision not found.')

    expect(stub.rpcCalls).toEqual([])
  })

  it('does not resolve another user\'s progression decision', async () => {
    const { ctx, stub } = makeStubCtx({
      progression_decisions: [
        {
          id: decisionId,
          user_id: 'user-2',
          program_instance_id: '1e971f91-572a-4d6a-86f1-d59946b802d5',
        },
      ],
    })

    await expect(resolveProgressionDecision(ctx, {
      decisionId,
      action: 'accepted',
      requestId: 'resolve-1',
    })).rejects.toThrow()

    expect(stub.rpcCalls).toEqual([])
  })
})
