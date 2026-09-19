import { Pressable, View } from 'react-native'
import { router } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import type { User } from '@supabase/supabase-js'
import { ArrowRight, BookOpen, ChevronRight, Database, Dumbbell, Palette, Scale, SlidersHorizontal, Timer, UserRound, type LucideIcon } from 'lucide-react-native'
import { getBodyweightEntries } from '@sheetless/data/account/bodyweight'
import type { UserProfile } from '@sheetless/domain/account/types'
import { experienceModeLabels } from '@sheetless/domain/account/experience-mode'
import { formatCompactDate } from '@sheetless/domain/shared/dates'
import { convertWeight } from '@sheetless/domain/shared/math'
import { accountQueryKeys } from '@sheetless/domain/shared/query-keys'
import { queryStaleTimes } from '@sheetless/domain/shared/query-stale-times'
import { formatWeight } from '@sheetless/domain/shared/set-notation'
import { Caption, Heading, Panel, Text } from '@/components'
import { buildUserContext } from '@/lib/account'
import { spacing, useTokens } from '@/lib/tokens'
import type { SettingsDraftValues } from './useSettingsDraft'

export type SettingsCategory = 'appearance' | 'workout' | 'experience' | 'body' | 'strength' | 'equipment' | 'data' | 'account'

export function SettingsMenu({ user, profile, values, onSelect }: {
  user: User
  profile: UserProfile
  values: SettingsDraftValues
  onSelect: (category: SettingsCategory) => void
}) {
  const { theme } = useTokens()
  const bodyweight = useQuery({
    queryKey: accountQueryKeys.bodyweight(user.id),
    queryFn: () => getBodyweightEntries(buildUserContext(user)),
    staleTime: queryStaleTimes.profile,
  })
  const latest = bodyweight.data?.at(-1)
  const estimateCount = Object.values(values.programStateDefaults).filter((value) => value != null && value > 0).length
  const rows: Array<{ key: SettingsCategory; title: string; summary: string; Icon: LucideIcon }> = [
    { key: 'appearance', title: 'Appearance & units', summary: `${values.themePreference === 'system' ? 'System theme' : values.themePreference === 'dark' ? 'Dark' : 'Light'} · ${values.units}`, Icon: Palette },
    { key: 'workout', title: 'Workout preferences', summary: `${values.autoStartTimer ? 'Auto rest' : 'Manual rest'} · ${values.defaultRestSeconds} sec`, Icon: Timer },
    { key: 'experience', title: 'Experience', summary: `${experienceModeLabels[profile.experienceMode]}${profile.experienceMode === 'full' && profile.showFormulas ? ' · formulas on' : ''}`, Icon: BookOpen },
    { key: 'body', title: 'Body & strength', summary: latest ? `${formatWeight(convertWeight(latest.weightKg, 'kg', values.units), values.units)} · ${formatCompactDate(latest.recordedOn)}` : bodyweight.isPending ? 'Loading bodyweight…' : bodyweight.isError ? 'Bodyweight unavailable · open to retry' : 'Bodyweight and scoring inputs', Icon: Scale },
    { key: 'strength', title: 'Starting strength', summary: `${estimateCount} saved ${estimateCount === 1 ? 'estimate' : 'estimates'}`, Icon: Dumbbell },
    { key: 'equipment', title: 'My equipment', summary: `${values.equipmentProfile.length} types selected`, Icon: SlidersHorizontal },
    { key: 'data', title: 'Data & help', summary: 'Online saving · Export · Feedback', Icon: Database },
    { key: 'account', title: 'Account', summary: 'Privacy and sign-in', Icon: UserRound },
  ]

  return (
    <View style={{ gap: spacing.lg }}>
      <View style={{ gap: spacing.xs }}>
        <Heading order={1}>Settings</Heading>
        <Text tone="dimmed">Make Sheetless work for you.</Text>
      </View>
      <View>
        {rows.map(({ key, title, summary, Icon }) => (
          <Pressable
            key={key}
            accessibilityRole="button"
            accessibilityLabel={`${title}. ${summary}`}
            onPress={() => onSelect(key)}
            testID={`settings-category-${key}`}
            style={({ pressed }) => ({
              alignItems: 'center', borderBottomWidth: 1, borderBottomColor: theme.border,
              flexDirection: 'row', gap: spacing.md, minHeight: 72, paddingVertical: spacing.md,
              opacity: pressed ? 0.65 : 1,
            })}
          >
            <Icon color={theme.text} size={22} strokeWidth={1.7} />
            <View style={{ flex: 1, gap: 3 }}>
              <Text size="lg" weight={700}>{title}</Text>
              <Caption>{summary}</Caption>
            </View>
            <ChevronRight color={theme.textMuted} size={18} />
          </Pressable>
        ))}
      </View>
      <Panel surface="inset" style={{ gap: spacing.xs, padding: spacing.md }}>
        <Text weight={700}>Looking for programme settings?</Text>
        <Caption>Manage active training loads in Plan.</Caption>
        <Pressable accessibilityRole="button" accessibilityLabel="Open Plan" onPress={() => router.navigate('/(tabs)/program')}
          style={{ alignItems: 'center', flexDirection: 'row', gap: spacing.sm, minHeight: 44 }}>
          <Text tone="action" weight={700}>Open Plan</Text>
          <ArrowRight color={theme.tones.action.text} size={17} />
        </Pressable>
      </Panel>
    </View>
  )
}
