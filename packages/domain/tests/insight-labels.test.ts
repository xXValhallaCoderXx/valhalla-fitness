import { describe, expect, it } from 'vitest'
import {
  bodyLoadLabels,
  insightCardLabels,
  insightTabLabels,
} from '@sheetless/domain/history/insight-labels'
import { HISTORY_TAB_VALUES } from '@sheetless/domain/history/history-tabs'

describe('insight vocabulary', () => {
  it('names every tab in both modes', () => {
    for (const tab of HISTORY_TAB_VALUES) {
      expect(insightTabLabels[tab].guided).toBeTruthy()
      expect(insightTabLabels[tab].full).toBeTruthy()
    }
  })

  /**
   * The muscle screen's e2e asserts that the exact string "Muscle fatigue" appears *nowhere* in
   * Guided. That is a property of the vocabulary, so it is cheaper to catch here than in a browser.
   */
  it('keeps the Full-only muscle wording out of Guided', () => {
    for (const [key, label] of Object.entries(bodyLoadLabels)) {
      expect(label.guided, `bodyLoadLabels.${key} leaks the Full wording`).not.toBe('Muscle fatigue')
    }
    expect(insightTabLabels['body-load'].guided).toBe('Muscles')
    expect(insightTabLabels['body-load'].full).toBe('Muscle fatigue')
  })

  it('titles the muscle screen the same in both modes, unlike its tab', () => {
    expect(bodyLoadLabels.screenTitle.guided).toBe(bodyLoadLabels.screenTitle.full)
    expect(insightTabLabels['body-load'].guided).not.toBe(insightTabLabels['body-load'].full)
  })

  // Guided never shows the metric's name; Full never hides it.
  it('splits the score vocabulary by mode', () => {
    expect(insightCardLabels.strengthScore.guided).toBe('Strength score')
    expect(insightCardLabels.strengthScore.full).toBe('DOTS')
  })
})
