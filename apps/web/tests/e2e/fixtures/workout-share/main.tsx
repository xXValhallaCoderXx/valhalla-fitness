import { createRoot } from 'react-dom/client'
import { useState } from 'react'
import { Button, MantineProvider, Modal } from '@mantine/core'
import '~/styles/app.css'
import { LazyWorkoutSharePreview } from '~/domains/history/components/sharing/LazyWorkoutSharePreview'
import { mantineTheme, mantineCssVariablesResolver } from '~/styles/mantine-theme'
import type { WorkoutShareModel } from '@sheetless/domain/history/workout-share'

const model: WorkoutShareModel = {
  title: 'Upper body strength & conditioning', date: '2026-09-05', dateLabel: 'September 5, 2026',
  filename: 'sheetless-workout-2026-09-05.png', completedSets: 26, durationSeconds: 3723, prCount: 2,
  exercises: [
    { movementId: 'a', name: 'Barbell bench press', result: '102.5 kg × 5', isPr: true },
    { movementId: 'b', name: 'Chest-supported dumbbell row', result: '35 kg × 12', isPr: true },
    { movementId: 'c', name: 'Standing overhead press', result: '60 kg × 6', isPr: false },
    { movementId: 'd', name: 'Push-ups', result: 'Bodyweight × 22', isPr: false },
    { movementId: 'e', name: '悬垂举腿 🏋️‍♀️ with a deliberately long Unicode movement name', result: '15 reps', isPr: false },
    { movementId: 'f', name: 'Cable triceps extension', result: '25 kg × 15', isPr: false },
  ], overflowCount: 3,
}
function Harness() {
  const [open, setOpen] = useState(true)
  const [account, setAccount] = useState(0)
  return <MantineProvider theme={mantineTheme} cssVariablesResolver={mantineCssVariablesResolver} defaultColorScheme="dark">
    <Button onClick={() => setOpen(true)}>Share workout</Button>
    <Modal opened={open} title="Share workout" onClose={() => setOpen(false)}>
      <Button onClick={() => setAccount((value) => value + 1)}>Change account</Button>
      {open ? <LazyWorkoutSharePreview key={account} model={{ ...model, title: account ? 'Another account workout' : model.title }} onBack={() => setOpen(false)} /> : null}
    </Modal>
  </MantineProvider>
}
createRoot(document.getElementById('root')!).render(<Harness />)
