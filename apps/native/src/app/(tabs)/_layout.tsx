import { Tabs } from 'expo-router'
import { View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { CalendarDays, History, UserRound, ListChecks, type LucideIcon } from 'lucide-react-native'
import { fontForWeight, useTokens } from '@/lib/tokens'
import { settingsNavigationGuard } from '@/features/settings/settings-navigation'

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
  { name: 'you', title: 'You', Icon: UserRound },
]

export default function TabsLayout() {
  const { theme } = useTokens()
  const insets = useSafeAreaInsets()
  return (
    <Tabs
      initialRouteName="index"
      screenListeners={({ navigation, route }) => ({
        tabPress: event => {
          const state = navigation.getState()
          // Reselecting a tab leaves its default scroll/pop behavior intact. A nested
          // dirty editor guards the resulting stack removal through usePreventRemove.
          if (state.routes[state.index]?.key === route.key) return
          if (settingsNavigationGuard.request(() => navigation.navigate(route.name))) event.preventDefault()
        },
      })}
      screenOptions={{
        // Screens render their own PageHeader — a native header would double the title.
        headerShown: false,
        tabBarHideOnKeyboard: true,
        tabBarActiveTintColor: theme.tones.action.text,
        tabBarInactiveTintColor: theme.textMuted,
        tabBarStyle: {
          backgroundColor: theme.backgroundElevated,
          borderTopColor: theme.border,
          borderTopWidth: 1,
          height: 56 + insets.bottom,
          paddingBottom: insets.bottom,
        },
        tabBarLabelStyle: {
          fontFamily: fontForWeight(800),
          fontSize: 11,
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
