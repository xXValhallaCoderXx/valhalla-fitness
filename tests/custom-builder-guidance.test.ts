import { describe, expect, it } from 'vitest'
import {
  evaluateCustomProgramDraft,
  hasBlockingIssue,
  recommendedDaysFor,
  type GuidanceCheck,
  type GuidanceIssue,
} from '../src/domains/program/lib/custom-builder-guidance'
import {
  createDefaultCustomProgramBuilderInput,
  type CustomProgramBuilderInput,
  type CustomProgramMethodology,
} from '../src/domains/program/lib/custom-templates'

function draftFor(methodology: CustomProgramMethodology, daysPerWeek: number): CustomProgramBuilderInput {
  return createDefaultCustomProgramBuilderInput({ methodology, daysPerWeek })
}

function withMains(draft: CustomProgramBuilderInput, mainMovementIds: string[]): CustomProgramBuilderInput {
  return {
    ...draft,
    sessions: draft.sessions.map((session, index) => ({
      ...session,
      mainMovementId: mainMovementIds[index] ?? session.mainMovementId,
    })),
  }
}

const checks = (issues: GuidanceIssue[], check: GuidanceCheck) => issues.filter((issue) => issue.check === check)
const hasCheck = (issues: GuidanceIssue[], check: GuidanceCheck) => issues.some((issue) => issue.check === check)

describe('recommendedDaysFor', () => {
  it('keeps logger flexible', () => {
    const rec = recommendedDaysFor('none')
    expect(rec.hardMin).toBe(1)
    expect(rec.idealMax).toBe(7)
  })

  it('targets 3-4 days for the wave methodologies', () => {
    for (const methodology of ['training_max_wave', 'plus_set_wave'] as const) {
      const rec = recommendedDaysFor(methodology)
      expect(rec.hardMin).toBe(2)
      expect(rec.idealMin).toBe(3)
      expect(rec.idealMax).toBe(4)
    }
  })

  it('allows a single linear day without blocking', () => {
    expect(recommendedDaysFor('simple_linear').hardMin).toBe(1)
  })
})

describe('schedule_fit', () => {
  it('blocks a wave methodology below its hard minimum', () => {
    const issues = evaluateCustomProgramDraft(draftFor('training_max_wave', 1))
    const fit = checks(issues, 'schedule_fit')
    expect(fit).toHaveLength(1)
    expect(fit[0]!.severity).toBe('block')
    expect(hasBlockingIssue(issues)).toBe(true)
  })

  it('warns below the ideal range without blocking', () => {
    const issues = evaluateCustomProgramDraft(draftFor('training_max_wave', 2))
    const fit = checks(issues, 'schedule_fit')
    expect(fit).toHaveLength(1)
    expect(fit[0]!.severity).toBe('warning')
    expect(hasBlockingIssue(issues)).toBe(false)
  })

  it('is quiet within the ideal range', () => {
    expect(hasCheck(evaluateCustomProgramDraft(draftFor('training_max_wave', 4)), 'schedule_fit')).toBe(false)
  })

  it('warns above the ideal range', () => {
    const fit = checks(evaluateCustomProgramDraft(draftFor('training_max_wave', 6)), 'schedule_fit')
    expect(fit).toHaveLength(1)
    expect(fit[0]!.severity).toBe('warning')
  })

  it('never blocks simple linear on a single day', () => {
    const fit = checks(evaluateCustomProgramDraft(draftFor('simple_linear', 1)), 'schedule_fit')
    expect(fit.every((issue) => issue.severity !== 'block')).toBe(true)
  })

  it('is quiet for logger at any supported frequency', () => {
    expect(hasCheck(evaluateCustomProgramDraft(draftFor('none', 1)), 'schedule_fit')).toBe(false)
    expect(hasCheck(evaluateCustomProgramDraft(draftFor('none', 7)), 'schedule_fit')).toBe(false)
  })
})

describe('name and session_count', () => {
  it('blocks short or empty names', () => {
    expect(hasCheck(evaluateCustomProgramDraft({ ...draftFor('training_max_wave', 3), name: '' }), 'name')).toBe(true)
    expect(hasCheck(evaluateCustomProgramDraft({ ...draftFor('training_max_wave', 3), name: 'ok' }), 'name')).toBe(true)
  })

  it('accepts a valid name', () => {
    expect(hasCheck(evaluateCustomProgramDraft({ ...draftFor('training_max_wave', 3), name: 'Valid name' }), 'name')).toBe(false)
  })

  it('blocks when session count does not match days per week', () => {
    const draft = draftFor('training_max_wave', 3)
    const tampered = { ...draft, sessions: draft.sessions.slice(0, 2) }
    expect(hasCheck(evaluateCustomProgramDraft(tampered), 'session_count')).toBe(true)
  })
})

describe('logger_empty', () => {
  it('blocks a logger day with no exercises', () => {
    const draft = draftFor('none', 2)
    const empty: CustomProgramBuilderInput = {
      ...draft,
      sessions: draft.sessions.map((session, index) => (index === 1 ? { ...session, loggerExercises: [] } : session)),
    }
    const logger = checks(evaluateCustomProgramDraft(empty), 'logger_empty')
    expect(logger).toHaveLength(1)
    expect(logger[0]!.severity).toBe('block')
    expect(logger[0]!.scope).toBe(1)
  })

  it('is quiet for a populated logger default', () => {
    expect(hasCheck(evaluateCustomProgramDraft(draftFor('none', 3)), 'logger_empty')).toBe(false)
  })
})

describe('duplicate_main', () => {
  it('warns on a repeated lift when there is room for distinct lifts', () => {
    const draft = withMains(draftFor('simple_linear', 3), ['squat', 'squat', 'bench_press'])
    const dup = checks(evaluateCustomProgramDraft(draft), 'duplicate_main')
    expect(dup).toHaveLength(1)
    expect(dup[0]!.scope).toBe(1)
  })

  it('is quiet for the distinct 4-day default', () => {
    expect(hasCheck(evaluateCustomProgramDraft(draftFor('training_max_wave', 4)), 'duplicate_main')).toBe(false)
  })

  it('warns when a lift is trained three or more times at high frequency', () => {
    const draft = withMains(draftFor('training_max_wave', 5), ['squat', 'squat', 'squat', 'bench_press', 'deadlift'])
    expect(hasCheck(evaluateCustomProgramDraft(draft), 'duplicate_main')).toBe(true)
  })

  it('tolerates a single expected repeat at five days', () => {
    expect(hasCheck(evaluateCustomProgramDraft(draftFor('simple_linear', 5)), 'duplicate_main')).toBe(false)
  })

  it('warns on an exact plus-set repeat (same lift and variation)', () => {
    const draft = draftFor('plus_set_wave', 6)
    // Default day 5 (index 4) is also a squat day but with a different variation; force the same one.
    const exactRepeat: CustomProgramBuilderInput = {
      ...draft,
      sessions: draft.sessions.map((session, index) =>
        index === 4 ? { ...session, mainMovementId: 'squat', variationMovementId: draft.sessions[0]!.variationMovementId } : session,
      ),
    }
    expect(hasCheck(evaluateCustomProgramDraft(exactRepeat), 'duplicate_main')).toBe(true)
  })

  it('is quiet when the plus-set repeat uses a different variation', () => {
    expect(hasCheck(evaluateCustomProgramDraft(draftFor('plus_set_wave', 6)), 'duplicate_main')).toBe(false)
  })
})

describe('accessory_volume', () => {
  const draftWithAccessoryCount = (count: number): CustomProgramBuilderInput => {
    const draft = draftFor('training_max_wave', 3)
    const accessory = draft.sessions[0]!.accessories[0]!
    return {
      ...draft,
      sessions: draft.sessions.map((session, index) =>
        index === 0
          ? { ...session, accessories: Array.from({ length: count }, () => ({ ...accessory })) }
          : session,
      ),
    }
  }

  it('warns at five accessories', () => {
    expect(hasCheck(evaluateCustomProgramDraft(draftWithAccessoryCount(5)), 'accessory_volume')).toBe(true)
  })

  it('warns at six accessories', () => {
    expect(hasCheck(evaluateCustomProgramDraft(draftWithAccessoryCount(6)), 'accessory_volume')).toBe(true)
  })

  it('is quiet at four accessories', () => {
    expect(hasCheck(evaluateCustomProgramDraft(draftWithAccessoryCount(4)), 'accessory_volume')).toBe(false)
  })
})

describe('weekly_balance', () => {
  it('warns when there is no lower-body main lift', () => {
    const draft = withMains(draftFor('training_max_wave', 2), ['bench_press', 'overhead_press'])
    const balance = checks(evaluateCustomProgramDraft(draft), 'weekly_balance')
    expect(balance.some((issue) => issue.message.includes('lower-body'))).toBe(true)
  })

  it('warns when there is no upper-body press', () => {
    const draft = withMains(draftFor('training_max_wave', 2), ['squat', 'deadlift'])
    const balance = checks(evaluateCustomProgramDraft(draft), 'weekly_balance')
    expect(balance.some((issue) => issue.message.includes('upper-body'))).toBe(true)
  })

  it('is quiet for the balanced 4-day default', () => {
    expect(hasCheck(evaluateCustomProgramDraft(draftFor('training_max_wave', 4)), 'weekly_balance')).toBe(false)
  })

  it('does not run balance checks for logger programmes', () => {
    expect(hasCheck(evaluateCustomProgramDraft(draftFor('none', 1)), 'weekly_balance')).toBe(false)
  })
})

describe('integration', () => {
  it('produces no blocks or warnings for the default 4-day training-max wave', () => {
    const issues = evaluateCustomProgramDraft(draftFor('training_max_wave', 4))
    expect(issues.filter((issue) => issue.severity !== 'info')).toHaveLength(0)
  })

  it('produces no blocks for the default 3-day logger', () => {
    expect(hasBlockingIssue(evaluateCustomProgramDraft(draftFor('none', 3)))).toBe(false)
  })

  it('reflects blocking state through hasBlockingIssue', () => {
    expect(hasBlockingIssue(evaluateCustomProgramDraft(draftFor('training_max_wave', 1)))).toBe(true)
    expect(hasBlockingIssue(evaluateCustomProgramDraft(draftFor('training_max_wave', 4)))).toBe(false)
  })
})
