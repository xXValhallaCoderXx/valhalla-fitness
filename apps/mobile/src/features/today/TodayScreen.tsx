import { api } from '@/api/client'
import { useSession } from '@/auth/SessionProvider'
import { AppButton } from '@/components/AppButton'
import { AppCard } from '@/components/AppCard'
import { Screen } from '@/components/Screen'
import { getMobileConfig } from '@/config/env'
import { useAppTheme } from '@/theme/useAppTheme'
import { queryKeys, SheetlessApiError } from '@sheetless/api'
import { typography } from '@sheetless/tokens'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as Crypto from 'expo-crypto'
import * as Linking from 'expo-linking'
import { router } from 'expo-router'
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native'
import { resolveTodayState } from './today-state'

const webUrl = getMobileConfig().webUrl

function openWeb(path: string) {
  return Linking.openURL(`${webUrl}${path}`)
}

export function TodayScreen() {
  const { colors } = useAppTheme()
  const { signOut } = useSession()
  const queryClient = useQueryClient()
  const today = useQuery({
    queryKey: queryKeys.today,
    queryFn: () => api.getToday(),
  })
  const start = useMutation({
    mutationFn: () =>
      api.startPlannedSession({ kind: 'planned', clientMutationId: Crypto.randomUUID() }),
    onSuccess: (session) => {
      queryClient.setQueryData(queryKeys.session(session.sessionId), session)
      void queryClient.invalidateQueries({ queryKey: queryKeys.today })
      router.push({ pathname: '/sessions/[sessionId]', params: { sessionId: session.sessionId } })
    },
  })

  const data = today.data
  const state = data ? resolveTodayState(data) : null
  const startError =
    start.error instanceof SheetlessApiError || start.error instanceof Error ? start.error.message : null

  return (
    <Screen>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={[styles.eyebrow, { color: colors.actionText }]}>TODAY</Text>
          <Text style={[styles.title, { color: colors.text }]}>Ready when you are</Text>
        </View>
        <AppButton label="Sign out" tone="secondary" onPress={() => void signOut()} style={styles.signOut} />
      </View>

      {today.isLoading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.actionText} size="large" />
          <Text style={{ color: colors.mutedText }}>Loading your training day…</Text>
        </View>
      ) : null}

      {today.isError ? (
        <AppCard>
          <Text accessibilityRole="alert" style={[styles.cardTitle, { color: colors.dangerText }]}>Today couldn’t load</Text>
          <Text style={[styles.body, { color: colors.mutedText }]}>{today.error.message}</Text>
          <AppButton label="Try again" onPress={() => void today.refetch()} />
        </AppCard>
      ) : null}

      {state?.kind === 'active' ? (
        <AppCard>
          <Text style={[styles.badge, { color: colors.successText }]}>WORKOUT IN PROGRESS</Text>
          <Text style={[styles.cardTitle, { color: colors.text }]}>{state.session.title}</Text>
          <Text style={[styles.body, { color: colors.mutedText }]}>
            {state.session.programTitle} · {state.session.weekLabel}
          </Text>
          <Text style={[styles.metric, { color: colors.text }]}>
            {state.session.completedSets}/{state.session.totalSets} sets logged
          </Text>
          <AppButton
            label="Resume workout"
            onPress={() => router.push({
              pathname: '/sessions/[sessionId]',
              params: { sessionId: state.session.sessionId },
            })}
          />
        </AppCard>
      ) : state?.kind === 'blocked' ? (
        <AppCard>
          <Text style={[styles.badge, { color: colors.warningText }]}>PROGRAM REVIEW NEEDED</Text>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Review progression before starting</Text>
          <Text style={[styles.body, { color: colors.mutedText }]}>
            {state.pendingDecisionCount} coaching {state.pendingDecisionCount === 1 ? 'decision is' : 'decisions are'} waiting on the web.
          </Text>
          <AppButton label="Open Program on web" onPress={() => void openWeb('/program')} />
        </AppCard>
      ) : state?.kind === 'planned' ? (
        <AppCard>
          <Text style={[styles.badge, { color: colors.actionText }]}>UP NEXT</Text>
          <Text style={[styles.cardTitle, { color: colors.text }]}>{state.session.title}</Text>
          <Text style={[styles.body, { color: colors.mutedText }]}>
            {state.session.programTitle} · {state.session.weekLabel}
          </Text>
          <View style={styles.metrics}>
            <Text style={[styles.metric, { color: colors.text }]}>{state.session.movementCount} movements</Text>
            <Text style={[styles.metric, { color: colors.text }]}>{state.session.setCount} sets</Text>
            <Text style={[styles.metric, { color: colors.text }]}>~{state.session.estimatedMinutes} min</Text>
          </View>
          <AppButton label="Start workout" loading={start.isPending} onPress={() => start.mutate()} />
          {startError ? <Text accessibilityRole="alert" style={[styles.body, { color: colors.dangerText }]}>{startError}</Text> : null}
        </AppCard>
      ) : state?.kind === 'completed' ? (
        <AppCard>
          <Text style={[styles.badge, { color: colors.successText }]}>TODAY COMPLETE</Text>
          <Text style={[styles.cardTitle, { color: colors.text }]}>{state.session.title}</Text>
          <Text style={[styles.body, { color: colors.mutedText }]}>Your logged work is already synced to Sheetless web.</Text>
          <AppButton label="View history on web" tone="secondary" onPress={() => void openWeb('/history')} />
        </AppCard>
      ) : state?.kind === 'noProgram' ? (
        <AppCard>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Choose your program on the web</Text>
          <Text style={[styles.body, { color: colors.mutedText }]}>Native program setup is coming later. Your selected plan will appear here automatically.</Text>
          <AppButton label="Browse programs" onPress={() => void openWeb('/templates')} />
        </AppCard>
      ) : state?.kind === 'empty' ? (
        <AppCard>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Nothing scheduled right now</Text>
          <Text style={[styles.body, { color: colors.mutedText }]}>Open your Program page to review the next training day.</Text>
          <AppButton label="Open Program on web" tone="secondary" onPress={() => void openWeb('/program')} />
        </AppCard>
      ) : null}
    </Screen>
  )
}

const styles = StyleSheet.create({
  header: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  headerCopy: { flex: 1, gap: 4 },
  eyebrow: { fontSize: typography.fontSize.xs, fontWeight: '900', letterSpacing: 1.2 },
  title: { fontSize: 28, fontWeight: '800' },
  signOut: { minHeight: 40, paddingHorizontal: 12 },
  loading: { alignItems: 'center', gap: 12, paddingVertical: 56 },
  badge: { fontSize: typography.fontSize.xs, fontWeight: '900', letterSpacing: 1 },
  cardTitle: { fontSize: 21, fontWeight: '800' },
  body: { fontSize: typography.fontSize.md, lineHeight: 20 },
  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  metric: { fontSize: typography.fontSize.md, fontWeight: typography.weight.strong },
})
