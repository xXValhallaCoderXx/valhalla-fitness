import { Directory, File, Paths } from 'expo-file-system'
import { randomUUID } from 'expo-crypto'
import { isAvailableAsync, shareAsync } from 'expo-sharing'
import { WORKOUT_SHARE_HEIGHT, WORKOUT_SHARE_WIDTH } from '@sheetless/workout-share'
import type { WorkoutImage } from './workout-image'

export type SvgExporter = { toDataURL: (callback: (data: string) => void, options: { width: number; height: number }) => void }

export async function prepareNativeImage(svg: SvgExporter, filename: string, renderScale = 1): Promise<WorkoutImage> {
  const base64 = await new Promise<string>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Image generation timed out')), 15_000)
    try {
      svg.toDataURL((data) => {
        clearTimeout(timeout)
        if (typeof data === 'string' && data.startsWith('iVBORw0KGgo')) resolve(data)
        else reject(new Error('PNG generation failed'))
      }, { width: WORKOUT_SHARE_WIDTH / renderScale, height: WORKOUT_SHARE_HEIGHT / renderScale })
    } catch (error) { clearTimeout(timeout); reject(error) }
  })
  const directory = new Directory(Paths.cache, `workout-share-${randomUUID()}`)
  const dispose = () => { if (directory.exists) directory.delete() }
  try {
    directory.create()
    const file = new File(directory, filename)
    file.create()
    file.write(base64, { encoding: 'base64' })
    // A capability failure should still leave a usable preview.
    const canShare = await isAvailableAsync().catch(() => false)
    return {
      uri: file.uri,
      canShare,
      share: () => shareAsync(file.uri, { dialogTitle: 'Share workout', mimeType: 'image/png', UTI: 'public.png' }),
      dispose,
    }
  } catch (error) {
    try { dispose() } catch { /* best effort */ }
    throw error
  }
}
