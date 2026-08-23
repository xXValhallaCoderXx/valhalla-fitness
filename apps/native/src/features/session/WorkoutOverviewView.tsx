import { ScrollView, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import type { User } from '@supabase/supabase-js'
import type { MovementSlot, WorkoutSession } from '@sheetless/domain/session/types/session'
import { sessionCompletion } from '@sheetless/domain/session/session-cache'
import { isMovementComplete } from '@sheetless/domain/session/live-session-utils'
import { spacing, useTokens } from '@/lib/tokens'
import { EmptyWorkoutOverview } from './EmptyWorkoutOverview'
import { FocusTopBar } from './FocusTopBar'
import { WorkoutCompleteBanner } from './FocusWorkoutActions'
import { WorkoutOverviewContent } from './WorkoutOverviewContent'

export function WorkoutOverviewView({
  user,
  session,
  activeMovement,
  notes,
  disabled,
  finishDisabled,
  onNotesChange,
  onSelectMovement,
  onEnterFocus,
  onBack,
  onRename,
  onFinish,
  onDiscard,
}: {
  user: User
  session: WorkoutSession
  activeMovement: MovementSlot | null
  notes: string
  disabled: boolean
  finishDisabled: boolean
  onNotesChange: (notes: string) => void
  onSelectMovement: (movementId: string | null) => void
  onEnterFocus: (movementId: string) => void
  onBack: () => void
  onRename: () => void
  onFinish: () => void
  onDiscard: () => void
}) {
  const { theme } = useTokens()
  const insets = useSafeAreaInsets()
  const progress = sessionCompletion(session)
  const completedMovements = session.movements.filter(isMovementComplete).length
  const allComplete = session.movements.length > 0 && completedMovements === session.movements.length

  return (
    <View style={{ backgroundColor: theme.background, flex: 1, paddingTop: insets.top }}>
      <FocusTopBar
        onBack={onBack}
        backDisabled={disabled}
        backLabel="Today"
        centerPrimary={session.title}
        centerSecondary={session.movements.length
          ? `${completedMovements} of ${session.movements.length} exercises · ${progress.percent}%`
          : 'No exercises yet'}
        equipmentMode={session.equipmentMode}
        finishLabel="Finish"
        finishDisabled={finishDisabled}
        onFinish={onFinish}
        renameDisabled={disabled}
        onRename={session.isAdHoc && session.status === 'in_progress' ? onRename : undefined}
        discardDisabled={disabled}
        onDiscard={onDiscard}
      />

      <View style={{ backgroundColor: theme.surface2, height: 4 }}>
        <View
          style={{
            backgroundColor: theme.primaryFill,
            height: 4,
            width: `${progress.percent}%`,
          }}
        />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          gap: spacing.md,
          padding: spacing.md,
          paddingBottom: spacing.md + insets.bottom,
        }}
        keyboardShouldPersistTaps="handled"
      >
        <WorkoutCompleteBanner visible={allComplete} disabled={finishDisabled} onFinish={onFinish} />
        {activeMovement ? (
          <WorkoutOverviewContent
            user={user}
            session={session}
            activeMovement={activeMovement}
            notes={notes}
            disabled={disabled}
            onNotesChange={onNotesChange}
            onSelectMovement={onSelectMovement}
            onEnterFocus={onEnterFocus}
          />
        ) : (
          <EmptyWorkoutOverview
            user={user}
            session={session}
            notes={notes}
            disabled={disabled}
            onNotesChange={onNotesChange}
            onAdded={onEnterFocus}
          />
        )}
      </ScrollView>
    </View>
  )
}
