import { lazy, Suspense } from 'react'
import type { WorkoutShareModel } from '@sheetless/domain/history/workout-share'
import { Text } from '~/components'

const Preview = lazy(() => import('./WorkoutSharePreview').then((module) => ({ default: module.WorkoutSharePreview })))

export function LazyWorkoutSharePreview(props: { model: WorkoutShareModel; onBack: () => void }) {
  return <Suspense fallback={<Text role="status">Loading image preview…</Text>}><Preview {...props} /></Suspense>
}
