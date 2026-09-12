import { describe, expect, it } from 'vitest'
import type { UserProfile } from '@sheetless/domain/account/types'
import { stateValuesForProfileTemplate } from '@sheetless/domain/program/template-start-utils'
import { templateCatalog } from '@sheetless/domain/program/templates'
import type { ProgramTemplateSummary } from '@sheetless/domain/program/types'
import type { ProgramStateDefaults } from '@sheetless/domain/shared/types'

function makeProfile(programStateDefaults: ProgramStateDefaults): UserProfile {
  return {
    id: 'user-1',
    email: 'lifter@example.com',
    units: 'kg',
    rounding: 2.5,
    equipmentProfile: [],
    themePreference: 'system',
    timezone: 'Europe/London',
    programStateDefaults,
    onboardingCompleted: true,
    liveOnboardingDismissed: true,
    postWorkoutFeedbackDismissed: true,
    autoStartTimer: true,
    defaultRestSeconds: 120,
    experienceMode: 'guided',
    showFormulas: false,
    fullModeHintDismissedAt: null,
  }
}

describe('stateValuesForProfileTemplate', () => {
  it('returns exactly the declared required-state keys for every built-in template', () => {
    const profile = makeProfile({
      squat_one_rep_max: 140,
      bench_press_one_rep_max: 100,
      deadlift_one_rep_max: 180,
      overhead_press_one_rep_max: 70,
      barbell_row_one_rep_max: 90,
    })

    for (const template of templateCatalog.filter((item) => item.origin === 'system_default')) {
      const stateValues = stateValuesForProfileTemplate(template, profile)

      expect(
        stateValues.map((state) => state.key),
        `${template.id} mirrors its required state`,
      ).toEqual(template.requiredState.map((state) => state.key))
      expect(stateValues).toHaveLength(template.requiredState.length)
      expect(new Set(stateValues.map((state) => state.key)).size).toBe(template.requiredState.length)
      expect(stateValues.every((state) => state.unit === profile.units)).toBe(true)
    }
  })

  it('derives working loads from profile one-rep maxes at 75 percent', () => {
    const template = templateCatalog.find((item) => item.id === 'generic_alternating_5x5_lp')!
    const stateValues = stateValuesForProfileTemplate(
      template,
      makeProfile({ squat_one_rep_max: 100, bench_press_one_rep_max: 82.5 }),
    )

    expect(stateValues.find((state) => state.key === 'squat_working_load')?.value).toBe(75)
    expect(stateValues.find((state) => state.key === 'bench_press_working_load')?.value).toBe(62.5)
    expect(stateValues.find((state) => state.key === 'deadlift_working_load')?.value).toBeNull()
  })

  it('derives training maxes from profile one-rep maxes at 90 percent', () => {
    const template = templateCatalog.find((item) => item.id === 'healthy-531-fsl')!
    const stateValues = stateValuesForProfileTemplate(
      template,
      makeProfile({ squat_one_rep_max: 140, bench_press_one_rep_max: 100 }),
    )

    expect(stateValues.find((state) => state.key === 'squat_training_max')?.value).toBe(125)
    expect(stateValues.find((state) => state.key === 'bench_press_training_max')?.value).toBe(90)
    expect(stateValues.find((state) => state.key === 'deadlift_training_max')?.value).toBeNull()
  })

  it('returns no state values for a template with no required state', () => {
    const noInputTemplate: ProgramTemplateSummary = {
      ...templateCatalog[0]!,
      id: 'test-no-input-template',
      requiredState: [],
    }

    expect(stateValuesForProfileTemplate(noInputTemplate, makeProfile({}))).toEqual([])
  })
})
