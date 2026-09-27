export type SettingsEntrySection = 'starting-numbers'

export function parseSettingsEntrySection(value: string | string[] | undefined): SettingsEntrySection | undefined {
  return value === 'starting-numbers' ? value : undefined
}

/** Consume a section handoff once, after the scroll content and target have been measured. */
export function createSettingsSectionScroll() {
  let section: SettingsEntrySection | undefined
  let targetY: number | undefined
  let contentHeight = 0
  let viewportHeight = 0
  let consumed = false

  return {
    setSection(next: SettingsEntrySection | undefined) {
      if (section !== next) {
        section = next
        consumed = false
      }
    },
    setTargetY(y: number) {
      if (!Number.isFinite(y) || y < 0) return
      targetY = y
    },
    setContentHeight(height: number) {
      if (!Number.isFinite(height) || height <= 0) return
      contentHeight = height
    },
    setViewportHeight(height: number) {
      if (!Number.isFinite(height) || height <= 0) return
      viewportHeight = height
    },
    takeOffset(): number | null {
      if (!section || consumed || targetY === undefined || contentHeight <= 0 || viewportHeight <= 0) return null
      if (targetY > contentHeight) return null
      consumed = true
      return Math.min(targetY, Math.max(0, contentHeight - viewportHeight))
    },
  }
}
