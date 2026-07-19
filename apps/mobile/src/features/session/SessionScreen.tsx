import { api } from '@/api/client'
import { AppButton } from '@/components/AppButton'
import { AppCard } from '@/components/AppCard'
import { Screen } from '@/components/Screen'
import { getMobileConfig } from '@/config/env'
import { useAppTheme } from '@/theme/useAppTheme'
import { queryKeys } from '@sheetless/api'
import {
  advanceAfterLog,
  firstActionableSetIndex,
  patchSetInSession,
  sessionCompletion,
  type WorkoutSession,
} from '@sheetless/core'
import { spacing, typography } from '@sheetless/tokens'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as Crypto from 'expo-crypto'
import * as Linking from 'expo-linking'
import { useMemo, useState } from 'react'
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native'
import { SetLogger, type SetDraft } from './SetLogger'
import { MovementTabs, SetTabs } from './SessionNavigation'

type Props = { sessionId: string }

type SavePayload = SetDraft & {
  movementId: string
  exerciseLogId: string
  setIndex: number
  clientMutationId: string
}

type FailedSave = { payload: SavePayload; message: string }

export function SessionScreen({ sessionId }: Props) {
  const { colors } = useAppTheme()
  const queryClient = useQueryClient()
  const [movementId, setMovementId] = useState<string | null>(null)
  const [setIndex, setSetIndex] = useState<number | null>(null)
  const [failedSave, setFailedSave] = useState<FailedSave | null>(null)
  const sessionQuery = useQuery({
    queryKey: queryKeys.session(sessionId),
    queryFn: () => api.getSession(sessionId),
  })
  const session = sessionQuery.data
  const initialMovement = useMemo(() => {
    if (!session) return null
    return [...session.movements]
      .sort((left, right) => left.orderIndex - right.orderIndex)
      .find((item) => item.sets.some((set) => !set.completed)) ?? session.movements[0]
  }, [session])

  const save = useMutation({
    mutationFn: (payload: SavePayload) =>
      api.updateSet(sessionId, payload.exerciseLogId, payload.setIndex, {
        actualLoad: payload.actualLoad,
        actualReps: payload.actualReps,
        actualRir: payload.actualRir,
        completed: true,
        clientMutationId: payload.clientMutationId,
      }),
    onMutate: async (payload) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.session(sessionId) })
      const previous = queryClient.getQueryData<WorkoutSession>(queryKeys.session(sessionId))
      if (previous) {
        queryClient.setQueryData(
          queryKeys.session(sessionId),
          patchSetInSession(previous, {
            movementSlotId: payload.movementId,
            exerciseLogId: payload.exerciseLogId,
            setIndex: payload.setIndex,
            actualLoad: payload.actualLoad,
            actualReps: payload.actualReps,
            actualRir: payload.actualRir,
            completed: true,
            clientMutationId: payload.clientMutationId,
            syncState: 'saving',
          }),
        )
      }
      return { previous }
    },
    onSuccess: (authoritative, payload) => {
      queryClient.setQueryData(queryKeys.session(sessionId), authoritative)
      setFailedSave(null)
      void queryClient.invalidateQueries({ queryKey: queryKeys.today })
      const next = advanceAfterLog(authoritative, payload.movementId, payload.setIndex)
      if (next.kind === 'sessionComplete') return
      setMovementId(next.movementId)
      setSetIndex(next.setIndex)
    },
    onError: (error, payload, context) => {
      const current = queryClient.getQueryData<WorkoutSession>(queryKeys.session(sessionId)) ?? context?.previous
      if (current) {
        queryClient.setQueryData(
          queryKeys.session(sessionId),
          patchSetInSession(current, {
            movementSlotId: payload.movementId,
            exerciseLogId: payload.exerciseLogId,
            setIndex: payload.setIndex,
            actualLoad: payload.actualLoad,
            actualReps: payload.actualReps,
            actualRir: payload.actualRir,
            completed: true,
            clientMutationId: payload.clientMutationId,
            syncState: 'syncFailed',
          }),
        )
      }
      setFailedSave({ payload, message: error instanceof Error ? error.message : 'This set did not save.' })
    },
  })

  const activeMovement = session?.movements.find((movement) => movement.id === movementId) ?? initialMovement
  const activeSetIndex = activeMovement?.sets.some((set) => set.setIndex === setIndex)
    ? setIndex
    : activeMovement
      ? firstActionableSetIndex(activeMovement)
      : null
  const activeSet = activeMovement?.sets.find((set) => set.setIndex === activeSetIndex) ?? null
  const progress = useMemo(() => (session ? sessionCompletion(session) : null), [session])
  const selectedFailure =
    failedSave && failedSave.payload.movementId === activeMovement?.id && failedSave.payload.setIndex === activeSetIndex
      ? failedSave
      : null

  const selectMovement = (id: string) => {
    const movement = session?.movements.find((item) => item.id === id)
    if (!movement) return
    setMovementId(id)
    setSetIndex(firstActionableSetIndex(movement))
  }

  const logSet = (draft: SetDraft) => {
    if (!activeMovement || !activeSet) return
    setMovementId(activeMovement.id)
    setSetIndex(activeSet.setIndex)
    save.mutate({
      ...draft,
      movementId: activeMovement.id,
      exerciseLogId: activeMovement.id,
      setIndex: activeSet.setIndex,
      clientMutationId: Crypto.randomUUID(),
    })
  }

  if (sessionQuery.isLoading) {
    return (
      <Screen>
        <View style={styles.loading}>
          <ActivityIndicator color={colors.actionText} size="large" />
          <Text style={{ color: colors.mutedText }}>Loading workout…</Text>
        </View>
      </Screen>
    )
  }

  if (sessionQuery.isError || !session) {
    return (
      <Screen>
        <AppCard>
          <Text accessibilityRole="alert" style={[styles.title, { color: colors.dangerText }]}>Workout couldn’t load</Text>
          <Text style={[styles.body, { color: colors.mutedText }]}>{sessionQuery.error?.message ?? 'Workout not found.'}</Text>
          <AppButton label="Try again" onPress={() => void sessionQuery.refetch()} />
        </AppCard>
      </Screen>
    )
  }

  return (
    <Screen>
      <View style={styles.heading}>
        <View style={styles.headingCopy}>
          <Text style={[styles.eyebrow, { color: colors.actionText }]}>{session.weekLabel.toUpperCase()}</Text>
          <Text style={[styles.title, { color: colors.text }]}>{session.title}</Text>
          <Text style={[styles.body, { color: colors.mutedText }]}>{session.programTitle}</Text>
        </View>
        <Text style={[styles.progress, { color: colors.text }]}>{progress?.completed}/{progress?.total}</Text>
      </View>

      {progress?.total === progress?.completed ? (
        <View style={[styles.milestone, { backgroundColor: colors.successSoft, borderColor: colors.successBorder }]}>
          <Text style={[styles.milestoneTitle, { color: colors.successText }]}>All sets logged</Text>
          <Text style={[styles.body, { color: colors.mutedText }]}>This native milestone stops here. Finish the workout and review progression on the web.</Text>
          <AppButton
            label="Finish on web"
            tone="secondary"
            onPress={() => void Linking.openURL(`${getMobileConfig().webUrl}/sessions/${session.sessionId}`)}
          />
        </View>
      ) : null}

      <MovementTabs session={session} activeMovementId={activeMovement?.id ?? null} onSelect={selectMovement} />

      {activeMovement && activeSet ? (
        <AppCard>
          <Text style={[styles.eyebrow, { color: colors.mutedText }]}>{activeMovement.role.toUpperCase()}</Text>
          <Text style={[styles.movementTitle, { color: colors.text }]}>{activeMovement.performedMovementName ?? activeMovement.movementName}</Text>
          <SetTabs movement={activeMovement} activeSetIndex={activeSet.setIndex} onSelect={setSetIndex} />
          <SetLogger
            key={`${activeMovement.id}:${activeSet.setIndex}`}
            movement={activeMovement}
            set={activeSet}
            units={session.units}
            rounding={session.rounding}
            saving={save.isPending && save.variables?.movementId === activeMovement.id && save.variables.setIndex === activeSet.setIndex}
            failureMessage={selectedFailure?.message ?? null}
            onSave={logSet}
            onRetry={() => selectedFailure && save.mutate(selectedFailure.payload)}
          />
        </AppCard>
      ) : null}
    </Screen>
  )
}

const styles = StyleSheet.create({
  loading: { alignItems: 'center', gap: 12, paddingVertical: 56 },
  heading: { alignItems: 'flex-start', flexDirection: 'row', justifyContent: 'space-between' },
  headingCopy: { flex: 1, gap: 3 },
  eyebrow: { fontSize: typography.fontSize.xs, fontWeight: '900', letterSpacing: 0.9 },
  title: { fontSize: 25, fontWeight: '800' },
  body: { fontSize: typography.fontSize.md, lineHeight: 20 },
  progress: { fontSize: 22, fontWeight: '900' },
  milestone: { borderRadius: 14, borderWidth: 1, gap: spacing.sm, padding: spacing.md },
  milestoneTitle: { fontSize: typography.fontSize.xl, fontWeight: '900' },
  movementTitle: { fontSize: 22, fontWeight: '800' },
})
