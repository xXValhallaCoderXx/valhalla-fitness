import { describe, expect, it } from 'vitest'
import { palettes, radius, semanticColors, spacing, typography } from '../src'

describe('semantic tokens', () => {
  it('exports complete ten-shade palettes and both color modes', () => {
    expect(palettes.action).toHaveLength(10)
    expect(palettes.neutral).toHaveLength(10)
    expect(semanticColors.light.actionText).not.toBe(semanticColors.dark.actionText)
    expect(semanticColors.light).toHaveProperty('surface')
    expect(semanticColors.dark).toHaveProperty('surface')
  })

  it('exports platform-neutral sizing and typography values', () => {
    expect(spacing.md).toBe(14)
    expect(radius.lg).toBe(16)
    expect(typography.fontSize.md).toBe(14)
  })
})
