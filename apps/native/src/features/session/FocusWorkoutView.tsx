import { useState } from 'react'
import type { User } from '@supabase/supabase-js'
import type { WorkoutSession } from '@sheetless/domain/session/types/session'
import { EmptyWorkoutView } from './EmptyWorkoutView'
import { PopulatedFocusWorkoutView } from './PopulatedFocusWorkoutView'

export function FocusWorkoutView({ user, session }: { user: User; session: WorkoutSession }) {
  const [notes, setNotes] = useState(session.notes ?? '')

  if (!session.movements.length) {
    return (
      <EmptyWorkoutView
        user={user}
        session={session}
        notes={notes}
        onNotesChange={setNotes}
      />
    )
  }

  return (
    <PopulatedFocusWorkoutView
      user={user}
      session={session}
      notes={notes}
      onNotesChange={setNotes}
    />
  )
}
