import { Redirect } from 'expo-router'
import { settingsEntryDestination, type SettingsEntrySection } from './settings-section'

/** Keep existing Settings links valid while the You stack owns the editors. */
export function SettingsScreen({ section }: { section?: SettingsEntrySection }) {
  return <Redirect href={settingsEntryDestination(section)} />
}
