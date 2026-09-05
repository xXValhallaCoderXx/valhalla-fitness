import type { WorkoutShareModel } from '@sheetless/domain/history/workout-share'
import { WorkoutShareLoader } from './WorkoutShareLoader'

const loadPreview = () => import('./WorkoutSharePreview').then((module) => ({ default: module.WorkoutSharePreview }))

export function LazyWorkoutSharePreview(props: { model: WorkoutShareModel; onBack: () => void }) {
  return <WorkoutShareLoader load={loadPreview} {...props} />
}
