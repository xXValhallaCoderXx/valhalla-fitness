export type SettingsEntrySection = 'starting-numbers'

export function parseSettingsEntrySection(value: string | string[] | undefined): SettingsEntrySection | undefined {
  return value === 'starting-numbers' ? value : undefined
}

export function settingsEntryDestination(section?: SettingsEntrySection) {
  return section === 'starting-numbers' ? '/you/starting-numbers' as const : '/you' as const
}
