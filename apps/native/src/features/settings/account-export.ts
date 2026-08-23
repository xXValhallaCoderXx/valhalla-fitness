export type ShareableAccountExport = { exportedAt: string } & Record<string, unknown>

/** Platform fallback; Metro selects .native or .web in supported builds. */
export async function shareAccountExport(_value: ShareableAccountExport): Promise<void> {
  throw new Error('Account export sharing is unavailable on this platform.')
}
