import { Modal } from '@mantine/core'
import type { WorkoutShareModel } from '@sheetless/domain/history/workout-share'
import { WorkoutSharePreview } from './WorkoutSharePreview'

export function WorkoutShareDialog({ model, onClose }: { model: WorkoutShareModel; onClose: () => void }) {
  return <Modal opened onClose={onClose} title="Share workout" size="md">
    <WorkoutSharePreview model={model} onBack={onClose} />
  </Modal>
}
