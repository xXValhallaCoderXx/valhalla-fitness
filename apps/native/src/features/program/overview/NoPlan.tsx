import { router } from 'expo-router'
import { ListChecks } from 'lucide-react-native'
import { Button, Heading, Panel, SectionLabel, Text } from '@/components'
import { spacing, useTokens } from '@/lib/tokens'

export function NoPlan() {
  const { theme } = useTokens()
  return <>
    <SectionLabel>Nothing running</SectionLabel><Heading order={1}>Plan</Heading>
    <Panel style={{ padding: spacing.lg, gap: spacing.md }}>
      <ListChecks size={32} color={theme.textMuted} />
      <Heading order={2}>You are not running a plan</Heading>
      <Text tone="dimmed">Choose a programme to build your workouts from your starting values. You can also train without one — Today offers a blank workout.</Text>
      <Button fullWidth label="Find my plan" onPress={() => router.push('/templates/find')} />
      <Button fullWidth label="Browse all programmes" variant="default" onPress={() => router.navigate('/templates')} testID="plan-browse-programs" />
      <Button fullWidth label="Train without a plan" variant="subtle" onPress={() => router.navigate('/(tabs)')} />
    </Panel>
  </>
}
