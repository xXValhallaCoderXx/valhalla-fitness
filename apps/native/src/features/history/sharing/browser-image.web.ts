import { WORKOUT_SHARE_HEIGHT, WORKOUT_SHARE_WIDTH } from '@sheetless/workout-share'
import type { WorkoutImage } from './workout-image'

/** Metro web uses canvas because react-native-svg's native toDataURL module is absent. */
export async function prepareWebImage(svg: string, filename: string): Promise<WorkoutImage> {
  const source = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }))
  try {
    const image = new Image()
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => { image.src = ''; reject(new Error('Image generation timed out')) }, 15_000)
      image.onload = () => { clearTimeout(timeout); resolve() }
      image.onerror = () => { clearTimeout(timeout); reject(new Error('Image generation failed')) }
      image.src = source
    })
    const canvas = document.createElement('canvas')
    canvas.width = WORKOUT_SHARE_WIDTH
    canvas.height = WORKOUT_SHARE_HEIGHT
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Image generation is unavailable')
    context.drawImage(image, 0, 0, canvas.width, canvas.height)
    const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((value) => value ? resolve(value) : reject(new Error('PNG generation failed')), 'image/png'))
    const file = new File([blob], filename, { type: 'image/png' })
    let canShare = false
    try { canShare = typeof navigator.share === 'function' && navigator.canShare?.({ files: [file] }) === true } catch { /* unavailable */ }
    const uri = URL.createObjectURL(file)
    return {
      uri, canShare, dispose: () => URL.revokeObjectURL(uri),
      share: () => navigator.share({ files: [file] }),
      download: async () => {
        const link = document.createElement('a')
        link.href = uri
        link.download = filename
        document.body.appendChild(link)
        try { link.click(); await new Promise((resolve) => setTimeout(resolve, 1000)) } finally { link.remove() }
      },
    }
  } finally { URL.revokeObjectURL(source) }
}
