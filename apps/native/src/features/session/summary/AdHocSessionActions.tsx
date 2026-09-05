import { useState } from 'react'
import { Alert } from 'react-native'
import { RotateCw, Star } from 'lucide-react-native'
import { router } from 'expo-router'
import { useIsMutating, useQueryClient } from '@tanstack/react-query'
import type { User } from '@supabase/supabase-js'
import type { WorkoutSession } from '@sheetless/domain/session/types/session'
import type { TodayPayload } from '@sheetless/domain/session/types/read-models'
import { accountQueryKeys } from '@sheetless/domain/shared/query-keys'
import { Button, Panel, Text } from '@/components'
import { spacing, useTokens } from '@/lib/tokens'
import { useSessionFavorite } from './useSessionFavorite'
import { useStartAdHocWorkout } from '../today/useStartAdHocWorkout'
import { FavoriteNameDialog } from './FavoriteNameDialog'

export function AdHocSessionActions({
  user,
  session,
  onRepeatStarted,
}: {
  user: User
  session: WorkoutSession
  onRepeatStarted?: () => void
}) {
  const { theme } = useTokens()
  const queryClient = useQueryClient()
  const activeStarts = useIsMutating({ mutationKey: ['startSession', user.id] })
  const [nameOpen, setNameOpen] = useState(false)
  const repeat = useStartAdHocWorkout(user)
  const favorite = useSessionFavorite(user)

  if (!session.isAdHoc || session.status !== 'completed') return null

  const favoriteError = favorite.isError
    ? favorite.error instanceof Error
      ? favorite.error.message
      : 'Unable to update this favourite.'
    : null
  const repeatError = repeat.isError
    ? repeat.error instanceof Error
      ? repeat.error.message
      : 'Unable to repeat this workout.'
    : null

  return (
    <>
      <Panel style={{ gap: spacing.sm, padding: spacing.md }}>
        <Button
          label={session.isFavorite ? 'Favourited' : 'Favourite'}
          variant="default"
          fullWidth
          loading={favorite.isPending}
          disabled={repeat.isPending}
          leftSection={
            <Star
              color={theme.tones.accent.text}
              fill={session.isFavorite ? theme.tones.accent.text : 'transparent'}
              size={16}
            />
          }
          onPress={() => {
            favorite.reset()
            if (session.isFavorite) {
              favorite.mutate({ sessionId: session.sessionId, favorite: false })
            } else {
              setNameOpen(true)
            }
          }}
        />
        <Button
          label="Repeat workout"
          fullWidth
          loading={repeat.isPending}
          disabled={favorite.isPending || activeStarts > 0}
          leftSection={<RotateCw color={theme.primaryFillText} size={16} />}
          onPress={() => {
            repeat.reset()
            const activeSessionId = queryClient.getQueryData<TodayPayload>(
              accountQueryKeys.today(user.id),
            )?.activeSession?.sessionId
            if (activeSessionId) {
              Alert.alert(
                'Workout already in progress',
                'Open your current workout before starting another one.',
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Open workout',
                    onPress: () => {
                      onRepeatStarted?.()
                      router.push({
                        pathname: '/session/[sessionId]',
                        params: { sessionId: activeSessionId },
                      })
                    },
                  },
                ],
              )
              return
            }
            repeat.mutate({ sourceSessionId: session.sessionId }, {
              onSuccess: (nextSession) => {
                onRepeatStarted?.()
                router.push({
                  pathname: '/session/[sessionId]',
                  params: { sessionId: nextSession.sessionId },
                })
              },
            })
          }}
        />
        {favoriteError && !nameOpen ? <Text size="sm" tone="danger">{favoriteError}</Text> : null}
        {repeatError ? <Text size="sm" tone="danger">{repeatError}</Text> : null}
      </Panel>
      <FavoriteNameDialog
        open={nameOpen}
        initialTitle={session.title}
        isPending={favorite.isPending}
        error={favoriteError}
        onCancel={() => {
          if (!favorite.isPending) {
            setNameOpen(false)
            favorite.reset()
          }
        }}
        onSave={(title) =>
          favorite.mutate(
            { sessionId: session.sessionId, favorite: true, title },
            { onSuccess: () => setNameOpen(false) },
          )
        }
      />
    </>
  )
}
