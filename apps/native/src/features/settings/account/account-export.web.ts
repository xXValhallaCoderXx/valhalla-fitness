import {
  accountExportFilename,
  serializeAccountExport,
} from '@sheetless/domain/account/data-rights'
import type { ShareableAccountExport } from './account-export'

export async function shareAccountExport(value: ShareableAccountExport): Promise<void> {
  const objectUrl = URL.createObjectURL(
    new Blob([serializeAccountExport(value)], { type: 'application/json' }),
  )
  const download = document.createElement('a')
  try {
    download.href = objectUrl
    download.download = accountExportFilename(value.exportedAt)
    document.body.append(download)
    download.click()
  } finally {
    download.remove()
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0)
  }
}
