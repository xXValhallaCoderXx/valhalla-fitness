import { Pressable } from 'react-native'
import { router } from 'expo-router'
import { Settings } from 'lucide-react-native'
import { useTokens } from '@/lib/tokens'

export function SettingsHeaderAction({ testID = 'settings-action' }: { testID?: string }) {
  const { theme } = useTokens()
  return (
    <Pressable
      accessibilityLabel="Open settings"
      accessibilityRole="button"
      onPress={() => router.push('/settings')}
      style={({ pressed }) => ({
        alignItems: 'center',
        height: 44,
        justifyContent: 'center',
        opacity: pressed ? 0.6 : 1,
        width: 44,
      })}
      testID={testID}
    >
      <Settings color={theme.textMuted} size={21} />
    </Pressable>
  )
}
