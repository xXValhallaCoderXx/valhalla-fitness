import type { createPreviewController, PreparedImage } from '@sheetless/workout-share/preview-controller'

export type WorkoutImage = PreparedImage & {
  canShare: boolean
  share: () => Promise<void>
  download?: () => Promise<void>
}

export type RasterizerProps = {
  svg: string
  filename: string
  requestKey: string
  previewVisible: boolean
  controller: ReturnType<typeof createPreviewController<WorkoutImage>>
}
