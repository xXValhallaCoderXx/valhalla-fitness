import { ScrollView, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import type { User } from '@supabase/supabase-js'
import type { UserProfile } from '@sheetless/domain/account/types'
import { BrandMark, Button, Caption, Heading, Panel, Screen, SegmentedControl, Text } from '@/components'
import { useMe } from '@/lib/account'
import { useSession } from '@/lib/session-provider'
import { spacing, useTokens } from '@/lib/tokens'
import { useFirstRun } from './useFirstRun'

export function FirstRunScreen() {
  const me = useMe()
  const { user } = useSession()
  if (!user || !me.data || me.data.id !== user.id) {
    return (
      <Screen>
        <Heading order={1}>Your preferences</Heading>
        <Text>{me.isError ? 'Your profile could not be loaded.' : 'Loading your profile…'}</Text>
        {me.isError ? <Button label="Retry" onPress={() => void me.refetch()} /> : null}
      </Screen>
    )
  }
  return <FirstRunChoices key={user.id} profile={me.data} user={user} />
}

function FirstRunChoices({ profile, user }: { profile: UserProfile; user: User }) {
  const choices = useFirstRun(profile, user)
  const { theme } = useTokens()
  const insets = useSafeAreaInsets()
  const load = choices.units === 'kg' ? '60 kg' : '135 lb'
  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <ScrollView
        contentContainerStyle={{
          gap: spacing.xl, padding: spacing.lg, paddingTop: insets.top + spacing.lg,
          width: '100%', maxWidth: 560, alignSelf: 'center',
        }}
      >
        <View style={{ gap: spacing.sm }}>
          <BrandMark size={40} />
          <Heading order={1}>Two quick choices</Heading>
          <Text tone="dimmed">Change either one any time in You → Settings.</Text>
        </View>
        <View style={{ gap: spacing.sm }}>
          <Heading order={2}>Weights in</Heading>
          <SegmentedControl
            variant="segments" accessibilityRole="radiogroup" accessibilityLabel="Weight units"
            value={choices.units} onChange={choices.setUnits} disabled={choices.saving}
            options={[{ value: 'kg', label: 'kg', accessibilityLabel: 'Kilograms' }, { value: 'lb', label: 'lb', accessibilityLabel: 'Pounds' }]}
          />
          <Caption>{choices.units === 'kg' ? 'Kilograms' : 'Pounds'}</Caption>
        </View>
        <View style={{ gap: spacing.sm }}>
          <Heading order={2}>How much detail?</Heading>
          <SegmentedControl
            variant="segments" accessibilityRole="radiogroup" accessibilityLabel="Workout detail"
            value={choices.experienceMode} onChange={choices.setExperienceMode} disabled={choices.saving}
            options={[{ value: 'guided', label: 'Simple' }, { value: 'full', label: 'Advanced' }]}
          />
          <Text tone="dimmed" size="sm">
            {choices.experienceMode === 'guided'
              ? 'Plain instructions with extra detail one tap away.'
              : 'See the numbers behind your workout up front.'}
          </Text>
          <Panel style={{ gap: spacing.sm, padding: spacing.md }}>
            <Caption>EXAMPLE · SAME WORKOUT, DIFFERENT DETAIL</Caption>
            <Heading order={3}>Squat · {load}</Heading>
            <Text>3 sets × 5 reps</Text>
            <Text tone="dimmed" size="sm">
              {choices.experienceMode === 'guided' ? 'Your weight for these sets.' : '75% of your training max.'}
            </Text>
          </Panel>
          <Caption>Both modes use the same training plan and progression.</Caption>
        </View>
      </ScrollView>
      <View style={{
        gap: spacing.sm, padding: spacing.lg, paddingBottom: insets.bottom + spacing.md,
        width: '100%', maxWidth: 560, alignSelf: 'center',
      }}>
        {choices.error ? <View accessibilityLiveRegion="polite"><Text tone="danger">{choices.error}</Text></View> : null}
        <Button label="Continue" fullWidth size="lg" loading={choices.saving} onPress={() => void choices.save()} testID="first-run-continue" />
        <Caption style={{ textAlign: 'center' }}>Bodyweight and starting numbers come later, where they’re needed.</Caption>
      </View>
    </View>
  )
}
