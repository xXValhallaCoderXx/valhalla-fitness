import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  ACCOUNT_DELETE_CONFIRMATION,
  accountExportFilename,
  buildAccountExportIdentity,
  deleteAccountInputSchema,
  isAccountDeleteConfirmed,
  serializeAccountExport,
} from '../src/domains/account/lib/data-rights'

describe('account data rights', () => {
  it('requires the destructive confirmation phrase exactly', () => {
    expect(isAccountDeleteConfirmed(ACCOUNT_DELETE_CONFIRMATION)).toBe(true)
    expect(isAccountDeleteConfirmed('delete my account')).toBe(false)
    expect(isAccountDeleteConfirmed(` ${ACCOUNT_DELETE_CONFIRMATION}`)).toBe(false)
    expect(isAccountDeleteConfirmed(`${ACCOUNT_DELETE_CONFIRMATION} `)).toBe(false)
  })

  it('rejects malformed and over-posted delete-account input', () => {
    expect(() =>
      deleteAccountInputSchema.parse({ confirmation: ACCOUNT_DELETE_CONFIRMATION }),
    ).not.toThrow()
    expect(() =>
      deleteAccountInputSchema.parse({ confirmation: 'delete my account' }),
    ).toThrow()
    expect(() =>
      deleteAccountInputSchema.parse({
        confirmation: ACCOUNT_DELETE_CONFIRMATION,
        userId: 'someone-else',
      }),
    ).toThrow()
  })

  it('exports only a concrete safe subset of authentication metadata', () => {
    const identity = buildAccountExportIdentity({
      id: 'user-1',
      email: 'lifter@example.com',
      created_at: '2026-07-01T00:00:00.000Z',
      user_metadata: {
        full_name: 'Example Lifter',
        avatar_url: 'https://example.com/avatar.png',
        access_token: 'must-not-be-exported',
        nested: { arbitrary: true },
      },
    })

    expect(identity).toMatchObject({
      id: 'user-1',
      email: 'lifter@example.com',
      createdAt: '2026-07-01T00:00:00.000Z',
      userMetadata: {
        fullName: 'Example Lifter',
        avatarUrl: 'https://example.com/avatar.png',
      },
    })
    expect(JSON.stringify(identity)).not.toContain('must-not-be-exported')
    expect(JSON.stringify(identity)).not.toContain('arbitrary')
  })

  it('creates a dated, formatted JSON download', () => {
    expect(accountExportFilename('2026-07-28T12:34:56.000Z')).toBe(
      'sheetless-account-export-2026-07-28.json',
    )
    expect(serializeAccountExport({ ok: true })).toBe('{\n  "ok": true\n}\n')
  })
})

describe('account export coverage', () => {
  const source = readFileSync(
    resolve(process.cwd(), 'src/domains/account/server/data-rights-functions.ts'),
    'utf8',
  )

  it('queries every user-owned application table plus custom template versions', () => {
    const exportedTables = [
      'profiles',
      'bodyweight_entries',
      'feedback_events',
      'program_templates',
      'program_template_versions',
      'program_instances',
      'program_state_values',
      'program_movement_overrides',
      'program_accessory_additions',
      'workout_sessions',
      'exercise_logs',
      'set_logs',
      'substitution_logs',
      'progression_decisions',
      'session_program_change_journal',
    ]

    for (const table of exportedTables) {
      expect(source).toContain(`from('${table}')`)
    }
  })

  it('paginates instead of relying on the PostgREST row cap', () => {
    expect(source).toContain('EXPORT_PAGE_SIZE = 1_000')
    expect(source).toContain('.range(from, to)')
  })
})

describe('self-delete migration hardening', () => {
  const sql = readFileSync(
    resolve(
      process.cwd(),
      '../../supabase/migrations/202607280004_account_self_service_delete.sql',
    ),
    'utf8',
  ).toLowerCase()

  it('locks the security-definer RPC to the authenticated subject', () => {
    expect(sql).toContain('security definer')
    expect(sql).toContain("set search_path = ''")
    expect(sql).toContain('auth.uid()')
    expect(sql).toContain("'delete my account'")
    expect(sql).toMatch(/revoke all on function public\.delete_own_account\(text\)[\s\S]*authenticated/)
    expect(sql).toMatch(/grant execute on function public\.delete_own_account\(text\)[\s\S]*authenticated/)
  })

  it('captures custom templates before deleting the auth identity', () => {
    const captureTemplatesAt = sql.indexOf('from public.program_templates')
    const deleteAuthUserAt = sql.indexOf('delete from auth.users')
    const deleteTemplatesAt = sql.indexOf('delete from public.program_templates')

    expect(captureTemplatesAt).toBeGreaterThan(-1)
    expect(deleteAuthUserAt).toBeGreaterThan(captureTemplatesAt)
    expect(deleteTemplatesAt).toBeGreaterThan(deleteAuthUserAt)
  })
})
