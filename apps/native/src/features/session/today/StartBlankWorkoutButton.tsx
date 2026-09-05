import { View } from 'react-native'
import { router } from 'expo-router'
import { useIsMutating } from '@tanstack/react-query'
import type { ButtonProps } from '@/components'
import { Button, Text } from '@/components'
import { useSession } from '@/lib/session-provider'
import { spacing } from '@/lib/tokens'
import { useStartAdHocWorkout } from './useStartAdHocWorkout'

export function StartBlankWorkoutButton({
  variant = 'default',
  fullWidth = true,
  disabled = false,
}: Pick<ButtonProps, 'variant' | 'fullWidth' | 'disabled'>) {
  const { user } = useSession()
  const start = useStartAdHocWorkout(user!)
  const activeStarts = useIsMutating({ mutationKey: ['startSession', user?.id] })

  return (
    <View style={{ gap: spacing.xs }}>
      <Button
        label="Start blank workout"
        variant={variant}
        fullWidth={fullWidth}
        loading={start.isPending}
        disabled={!user || disabled || activeStarts > 0}
        testID="today-start-blank-workout"
        onPress={() =>
          start.mutate({}, {
            onSuccess: (session) => {
              router.push({
                pathname: '/session/[sessionId]',
                params: { sessionId: session.sessionId },
              })
            },
          })
        }
      />
      {start.isError ? (
        <Text size="sm" tone="danger">
          {start.error instanceof Error ? start.error.message : 'The workout could not start.'}
        </Text>
      ) : null}
    </View>
  )
}
