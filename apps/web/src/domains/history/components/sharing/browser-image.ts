import { WORKOUT_SHARE_HEIGHT, WORKOUT_SHARE_WIDTH } from '@sheetless/workout-share'

export type BrowserShareImage = {
  uri: string
  file: File
  canShare: boolean
  dispose: () => void
}

export function canShareImage(file: File): boolean {
  try { return typeof navigator.share === 'function' && navigator.canShare?.({ files: [file] }) === true } catch { return false }
}

export async function prepareBrowserImage(svg: string, filename: string): Promise<BrowserShareImage> {
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
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('PNG generation failed')), 'image/png')
    })
    const file = new File([blob], filename, { type: 'image/png' })
    const uri = URL.createObjectURL(file)
    return { file, uri, canShare: canShareImage(file), dispose: () => URL.revokeObjectURL(uri) }
  } finally {
    URL.revokeObjectURL(source)
  }
}

export function shareBrowserImage(image: BrowserShareImage): Promise<void> {
  return navigator.share({ files: [image.file] })
}

export async function downloadBrowserImage(image: BrowserShareImage): Promise<void> {
  const link = document.createElement('a')
  link.href = image.uri
  link.download = image.file.name
  document.body.appendChild(link)
  try {
    link.click()
    // Give the browser time to consume the URL before an immediate close can release it.
    await new Promise((resolve) => setTimeout(resolve, 1000))
  } finally {
    link.remove()
  }
}
