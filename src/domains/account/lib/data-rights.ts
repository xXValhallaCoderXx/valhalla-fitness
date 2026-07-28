import { z } from 'zod'

export const ACCOUNT_DELETE_CONFIRMATION = 'DELETE MY ACCOUNT'
export const ACCOUNT_EXPORT_SCHEMA_VERSION = '2026-07-28'
export const deleteAccountInputSchema = z
  .object({
    confirmation: z.literal(ACCOUNT_DELETE_CONFIRMATION),
  })
  .strict()

type AuthIdentityInput = {
  id: string
  email?: string | null
  phone?: string | null
  created_at?: string
  updated_at?: string
  last_sign_in_at?: string | null
  email_confirmed_at?: string | null
  phone_confirmed_at?: string | null
  is_anonymous?: boolean
  user_metadata?: Record<string, unknown>
}

export function isAccountDeleteConfirmed(value: string) {
  return value === ACCOUNT_DELETE_CONFIRMATION
}

export function buildAccountExportIdentity(user: AuthIdentityInput) {
  const metadata = user.user_metadata ?? {}

  return {
    id: user.id,
    email: user.email ?? null,
    phone: user.phone ?? null,
    createdAt: user.created_at ?? null,
    updatedAt: user.updated_at ?? null,
    lastSignInAt: user.last_sign_in_at ?? null,
    emailConfirmedAt: user.email_confirmed_at ?? null,
    phoneConfirmedAt: user.phone_confirmed_at ?? null,
    isAnonymous: user.is_anonymous ?? false,
    userMetadata: {
      displayName: readMetadataString(metadata, 'display_name'),
      fullName: readMetadataString(metadata, 'full_name'),
      name: readMetadataString(metadata, 'name'),
      avatarUrl: readMetadataString(metadata, 'avatar_url'),
    },
  }
}

function readMetadataString(metadata: Record<string, unknown>, key: string) {
  const value = metadata[key]
  return typeof value === 'string' ? value : null
}

export function accountExportFilename(exportedAt: string) {
  const exportDate = /^\d{4}-\d{2}-\d{2}/.exec(exportedAt)?.[0] ?? 'unknown-date'
  return `sheetless-account-export-${exportDate}.json`
}

export function serializeAccountExport(value: unknown) {
  return `${JSON.stringify(value, null, 2)}\n`
}
