import { useState } from 'react'
import type { WorkoutSession } from '@sheetless/domain/session/types'
import { buildWorkoutShareModel, type WorkoutShareModel } from '@sheetless/domain/history/workout-share'
import { Button, SheetModal } from '@/components'
import { useSession } from '@/lib/session-provider'
import { WorkoutSharePreview } from './WorkoutSharePreview'

export function ShareWorkoutButton({ session }: { session: WorkoutSession }) {
  const { user } = useSession()
  const model = buildWorkoutShareModel(session)
  if (!user || !model) return null
  return <ShareAction key={`${user.id}:${session.sessionId}`} model={model} />
}

function ShareAction({ model }: { model: WorkoutShareModel }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button label="Share workout" variant="default" onPress={() => setOpen(true)} />
      <SheetModal open={open} title="Share workout" onClose={() => setOpen(false)}>
        {open ? <WorkoutSharePreview model={model} onBack={() => setOpen(false)} /> : null}
      </SheetModal>
    </>
  )
}
