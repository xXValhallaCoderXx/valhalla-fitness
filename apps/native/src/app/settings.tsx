import { useLocalSearchParams } from 'expo-router'
import { SettingsScreen } from '@/features/settings/SettingsScreen'
import { parseSettingsEntrySection } from '@/features/settings/settings-section'

export default function SettingsRoute() {
  const { section } = useLocalSearchParams<{ section?: string | string[] }>()
  return <SettingsScreen section={parseSettingsEntrySection(section)} />
}
