import { describe, expect, it } from 'vitest'
import { builderLabel, estimatedDayLengthLine, progressionPlainRules } from '../src/program/builder-labels'
import {
  SIMPLE_LINEAR_INCREMENT,
  TRAINING_MAX_STEP,
} from '../src/program/progression'

describe('progressionPlainRules', () => {
  // The design's own example sentence, and the reason it must be generated: the increments belong
  // to the rule that will run, not to this copy.
  it('quotes the simple-linear increments from the rule itself', () => {
    const rules = progressionPlainRules('simple_linear')
    expect(rules.join(' ')).toContain(
      `${SIMPLE_LINEAR_INCREMENT.upper} kg for presses, ${SIMPLE_LINEAR_INCREMENT.lower} kg for squats and deadlifts`,
    )
  })

  it('quotes both training-max bands', () => {
    const text = progressionPlainRules('training_max_wave').join(' ')
    expect(text).toContain(`${TRAINING_MAX_STEP.standard.upper} kg for presses`)
    expect(text).toContain(`${TRAINING_MAX_STEP.double.upper} and ${TRAINING_MAX_STEP.double.lower} kg`)
  })

  // Guided's rule is that it shows no percentages anywhere.
  it('says fractions rather than percentages', () => {
    for (const methodology of ['simple_linear', 'training_max_wave', 'plus_set_wave', 'none'] as const) {
      for (const sentence of progressionPlainRules(methodology)) {
        expect(sentence).not.toMatch(/%|\bpercent/i)
      }
    }
  })

  it('describes the plus-set wave as the training-max wave plus its extra rule', () => {
    const wave = progressionPlainRules('training_max_wave')
    const plus = progressionPlainRules('plus_set_wave')
    expect(plus.slice(0, wave.length)).toEqual(wave)
    expect(plus).toHaveLength(wave.length + 1)
  })

  it('says "a tenth", not "a 1 tenth"', () => {
    for (const methodology of ['simple_linear', 'training_max_wave'] as const) {
      expect(progressionPlainRules(methodology).join(' ')).toContain('a tenth')
      expect(progressionPlainRules(methodology).join(' ')).not.toContain('a 1 tenth')
    }
  })

  it('does not promise progression for a logger-only programme', () => {
    const rules = progressionPlainRules('none')
    expect(rules.join(' ')).not.toMatch(/add weight|moves up/i)
  })
})

describe('estimatedDayLengthLine', () => {
  it('averages the sessions and rounds to something a person would say', () => {
    // 45, 45, 53 averages 47.7 — "about 50 minutes", not a false-precision 47.
    expect(estimatedDayLengthLine([45, 45, 53])).toBe('About 50 minutes a day before accessories.')
    expect(estimatedDayLengthLine([45, 45, 45])).toBe('About 45 minutes a day before accessories.')
  })

  it('says nothing when there are no sessions to average', () => {
    expect(estimatedDayLengthLine([])).toBeNull()
  })
})

describe('builderLabel', () => {
  it('names the same object differently in each mode', () => {
    expect(builderLabel('gridHeading', 'guided')).toBe('Your programme')
    expect(builderLabel('gridHeading', 'full')).toBe('Definition')
    expect(builderLabel('yourWeek', 'guided')).toBe(builderLabel('yourWeek', 'full'))
  })
})
