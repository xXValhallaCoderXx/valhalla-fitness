import { describe, expect, it } from 'vitest'
import { mainWorkSentence, mainWorkSummary } from '@sheetless/domain/program/custom-builder-ui'
import {
  createDefaultCustomProgramBuilderInput,
  customProgramMethodologyValues,
} from '@sheetless/domain/program/custom-program-meta'

const sessionFor = (methodology: (typeof customProgramMethodologyValues)[number]) =>
  createDefaultCustomProgramBuilderInput({ methodology, daysPerWeek: 3 }).sessions[0]

describe('mainWorkSentence', () => {
  // Guided's premise is that it never shows the working. A rule line that reads "3x5 @ current
  // working load" is notation, which is what `mainWorkSummary` is for.
  it('says what the lift will do without notation, for every methodology', () => {
    for (const methodology of customProgramMethodologyValues) {
      const sentence = mainWorkSentence(methodology, sessionFor(methodology))
      expect(sentence).toMatch(/\.$/)
      expect(sentence).not.toMatch(/\d+x\d+|%|@|RIR/)
    }
  })

  it('describes the three wave and linear rules', () => {
    expect(mainWorkSentence('training_max_wave', sessionFor('training_max_wave'))).toBe(
      'Three sets that ramp up in weight, the last pushed for extra reps, then lighter back-off sets.',
    )
    expect(mainWorkSentence('plus_set_wave', sessionFor('plus_set_wave'))).toBe(
      'A few sets at one weight, with the last pushed for as many good reps as you can.',
    )
    expect(mainWorkSentence('simple_linear', sessionFor('simple_linear'))).toBe(
      'Three sets of five. Get every rep and the weight goes up next time.',
    )
  })

  // With no methodology the programme is a plain logger, so the sentence has to read the draft.
  it('reads the draft when there is no methodology to describe', () => {
    const session = { ...sessionFor('none'), mainSetCount: 4, mainTargetReps: 8 }
    expect(mainWorkSentence('none', session)).toBe('4 sets of 8, logged as you go.')
    expect(mainWorkSentence('none', { ...session, mainSetCount: 1 })).toBe('1 set of 8, logged as you go.')
  })

  it('leaves the notation form alone for Full', () => {
    expect(mainWorkSummary('simple_linear', sessionFor('simple_linear'))).toBe('3x5 @ current working load')
  })
})
