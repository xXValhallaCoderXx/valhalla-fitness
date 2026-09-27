import { File, Paths } from 'expo-file-system'
import { isAvailableAsync, shareAsync } from 'expo-sharing'
import {
  accountExportFilename,
  serializeAccountExport,
} from '@sheetless/domain/account/data-rights'
import type { ShareableAccountExport } from './account-export'

export async function shareAccountExport(value: ShareableAccountExport, isCurrent: () => boolean = () => true): Promise<void> {
  const available = await isAvailableAsync()
  if (!isCurrent()) return
  if (!available) throw new Error('File sharing is unavailable on this device.')

  const file = new File(Paths.cache, accountExportFilename(value.exportedAt))
  file.create({ overwrite: true })
  try {
    file.write(serializeAccountExport(value))
    await shareAsync(file.uri, {
      dialogTitle: 'Share Sheetless account export',
      mimeType: 'application/json',
      UTI: 'public.json',
    })
  } finally {
    try {
      if (file.exists) file.delete()
    } catch {
      // The cache is disposable; cleanup must not turn a successful share into an error.
    }
  }
}
