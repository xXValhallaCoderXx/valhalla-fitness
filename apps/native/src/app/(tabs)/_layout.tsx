import { Tabs } from 'expo-router'

// Minimal shell for now — the styled 4-tab bar mirroring web's AppShell lands
// with the component-promotion commit.
export default function TabsLayout() {
  return (
    <Tabs>
      <Tabs.Screen name="index" options={{ title: 'Today' }} />
    </Tabs>
  )
}
