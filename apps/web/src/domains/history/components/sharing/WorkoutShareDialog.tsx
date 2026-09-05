import { Modal } from '@mantine/core'
import type { WorkoutShareModel } from '@sheetless/domain/history/workout-share'
import { WorkoutSharePreview } from './WorkoutSharePreview'

export function WorkoutShareDialog({ model, onBack }: { model: WorkoutShareModel; onBack: () => void }) {
  return <Modal opened onClose={onBack} title="Share workout" size="md">
    <WorkoutSharePreview model={model} onBack={onBack} />
  </Modal>
}
