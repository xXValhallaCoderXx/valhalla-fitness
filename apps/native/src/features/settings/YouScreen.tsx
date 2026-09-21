import { router } from 'expo-router'
import { Button, PageHeader, Screen } from '@/components'

/** Navigation entry to the existing settings screen; profile design follows separately. */
export function YouScreen() {
  return <Screen>
    <PageHeader title="You" subtitle="Your profile, preferences and account." />
    <Button label="Open settings" onPress={() => router.push('/settings')} />
  </Screen>
}
