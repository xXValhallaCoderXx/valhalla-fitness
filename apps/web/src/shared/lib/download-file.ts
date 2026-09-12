/**
 * Hand the browser a generated file.
 *
 * Kept out of the components that build the content so the Blob/anchor dance lives in one place,
 * and so the object URL is always revoked — leaking one pins the whole file in memory for the life
 * of the document.
 */
export function downloadTextFile(filename: string, contents: string, mimeType = 'text/plain') {
  const url = URL.createObjectURL(new Blob([contents], { type: `${mimeType};charset=utf-8` }))
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.append(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}
