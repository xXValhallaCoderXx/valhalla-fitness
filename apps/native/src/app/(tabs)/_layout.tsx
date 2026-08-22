import { Tabs } from 'expo-router'
import { View } from 'react-native'
import { CalendarDays, History, Layers3, ListChecks, type LucideIcon } from 'lucide-react-native'
import { fontFamily, useTokens } from '@/lib/tokens'

/**
 * Icon wrapper adding the 2px active pill above the icon — web AppShell's
 * mobile nav indicator (`h-0.5 w-6 rounded-b-full` at the tab top).
 */
function TabIcon({ Icon, color, focused }: { Icon: LucideIcon; color: string; focused: boolean }) {
  return (
    <View style={{ alignItems: 'center' }}>
      <View
        style={{
          backgroundColor: focused ? color : 'transparent',
          borderBottomLeftRadius: 2,
          borderBottomRightRadius: 2,
          height: 2,
          marginBottom: 4,
          width: 24,
        }}
      />
      <Icon size={18} color={color} strokeWidth={2.2} />
    </View>
  )
}

const TABS: Array<{ name: string; title: string; Icon: LucideIcon }> = [
  { name: 'index', title: 'Today', Icon: CalendarDays },
  { name: 'program', title: 'Plan', Icon: ListChecks },
  { name: 'history', title: 'Insights', Icon: History },
  { name: 'templates', title: 'Programs', Icon: Layers3 },
]

export default function TabsLayout() {
  const { theme } = useTokens()
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: theme.backgroundElevated },
        headerTintColor: theme.text,
        headerTitleStyle: { fontFamily, fontWeight: '800' },
        headerShadowVisible: false,
        tabBarActiveTintColor: theme.tones.action.text,
        tabBarInactiveTintColor: theme.textMuted,
        tabBarStyle: {
          backgroundColor: theme.backgroundElevated,
          borderTopColor: theme.border,
          borderTopWidth: 1,
          height: 64,
        },
        tabBarLabelStyle: {
          fontFamily,
          fontSize: 9,
          fontWeight: '800',
        },
      }}
    >
      {TABS.map(({ name, title, Icon }) => (
        <Tabs.Screen
          key={name}
          name={name}
          options={{
            title,
            tabBarIcon: ({ color, focused }) => (
              <TabIcon Icon={Icon} color={String(color)} focused={focused} />
            ),
          }}
        />
      ))}
    </Tabs>
  )
}
