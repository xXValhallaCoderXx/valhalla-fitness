import { lazy, Suspense, useState } from 'react'
import { Button } from '@mantine/core'
import { Share2 } from 'lucide-react'
import { buildWorkoutShareModel, type WorkoutShareModel } from '@sheetless/domain/history/workout-share'
import type { WorkoutSession } from '~/domains/session'
import { useAccountId } from '~/domains/account/components/AccountIdentityProvider'

const ShareDialog = lazy(() => import('./WorkoutShareDialog').then((module) => ({ default: module.WorkoutShareDialog })))

export function ShareWorkoutButton({ session }: { session: WorkoutSession }) {
  const accountId = useAccountId()
  const model = buildWorkoutShareModel(session)
  if (!accountId || !model) return null
  return <ShareAction key={`${accountId}:${session.sessionId}`} model={model} />
}

function ShareAction({ model }: { model: WorkoutShareModel }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button variant="default" leftSection={<Share2 size={16} />} onClick={() => setOpen(true)}>Share workout</Button>
      {open ? <Suspense fallback={null}><ShareDialog model={model} onClose={() => setOpen(false)} /></Suspense> : null}
    </>
  )
}
