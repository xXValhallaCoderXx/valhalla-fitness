#!/usr/bin/env node
/* global console */

// Provision Supabase auth users for every email on the allowlist (Option A,
// invite-only). To grant access: add the email to public.allowed_emails, then
// run this so the user exists and is email-confirmed and can receive a
// magic-link OTP even with open signup disabled in the project.
//
// ADMIN / OFFLINE USE ONLY. Requires SUPABASE_SERVICE_ROLE_KEY. Never run this in
// the web server runtime and never put the service-role key on the app service.
//
// Usage:
//   node scripts/provision-allowed-users.mjs                        # provision all allowlisted emails
//   node scripts/provision-allowed-users.mjs add <email> [note...]  # add to allowlist + provision
//   node scripts/provision-allowed-users.mjs list                   # show the allowlist + status

import { createClient } from '@supabase/supabase-js'
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'

const [action = 'sync', ...rest] = process.argv.slice(2)

const env = loadEnv()
const localStatusEnv = shouldLoadLocalSupabaseStatus() ? loadLocalSupabaseStatusEnv() : {}
const supabaseUrl = process.env.SUPABASE_URL ?? env.SUPABASE_URL ?? localStatusEnv.API_URL ?? 'http://127.0.0.1:54321'
const serviceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  env.SUPABASE_SERVICE_ROLE_KEY ??
  localStatusEnv.SERVICE_ROLE_KEY ??
  localStatusEnv.SECRET_KEY

if (!serviceRoleKey) {
  console.error('Missing SUPABASE_SERVICE_ROLE_KEY.')
  console.error(
    'Set it for the production project, or for local run `pnpm exec supabase status -o env` and copy SERVICE_ROLE_KEY into .env.',
  )
  process.exit(1)
}

const adminClient = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

try {
  if (action === 'sync') {
    await syncAllowlist()
  } else if (action === 'add') {
    await addToAllowlist(rest)
  } else if (action === 'list') {
    await listAllowlist()
  } else {
    console.error(`Unknown action: ${action}`)
    console.error('Use one of: sync (default), add <email> [note], list')
    process.exit(1)
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
}

function normalizeEmail(email) {
  return String(email).trim().toLowerCase()
}

async function fetchAllowlist() {
  const { data, error } = await adminClient.from('allowed_emails').select('email, note')
  if (error) throw new Error(`Unable to read allowed_emails: ${error.message}`)
  return (data ?? []).map((row) => ({ email: normalizeEmail(row.email), note: row.note ?? null }))
}

async function listAuthUserEmails() {
  const emails = new Set()
  for (let page = 1; page < 50; page += 1) {
    const { data, error } = await adminClient.auth.admin.listUsers({ page, perPage: 1000 })
    if (error) throw new Error(`Unable to list auth users: ${error.message}`)
    for (const user of data.users ?? []) {
      if (user.email) emails.add(normalizeEmail(user.email))
    }
    if (!data.users?.length || data.users.length < 1000) break
  }
  return emails
}

async function provisionMissing(allowlist, existingEmails) {
  let created = 0
  for (const entry of allowlist) {
    if (existingEmails.has(entry.email)) {
      console.log(`= ${entry.email} (already provisioned)`)
      continue
    }
    const { error } = await adminClient.auth.admin.createUser({
      email: entry.email,
      email_confirm: true,
    })
    if (error) throw new Error(`Unable to provision ${entry.email}: ${error.message}`)
    created += 1
    console.log(`+ ${entry.email} (provisioned)`)
  }
  return created
}

async function syncAllowlist() {
  const allowlist = await fetchAllowlist()
  if (!allowlist.length) {
    console.log('Allowlist is empty. Add emails to public.allowed_emails (or use `add <email>`).')
    return
  }
  const existingEmails = await listAuthUserEmails()
  const created = await provisionMissing(allowlist, existingEmails)
  console.log(`Done. ${allowlist.length} on the allowlist, ${created} newly provisioned.`)
}

async function addToAllowlist(args) {
  const email = args[0] ? normalizeEmail(args[0]) : ''
  if (!email || !email.includes('@')) {
    console.error('Usage: node scripts/provision-allowed-users.mjs add <email> [note...]')
    process.exit(1)
  }
  const note = args.slice(1).join(' ').trim() || null
  const { error } = await adminClient.from('allowed_emails').upsert({ email, note }, { onConflict: 'email' })
  if (error) throw new Error(`Unable to add ${email} to the allowlist: ${error.message}`)
  console.log(`Allowlisted ${email}${note ? ` (${note})` : ''}.`)
  const existingEmails = await listAuthUserEmails()
  const created = await provisionMissing([{ email, note }], existingEmails)
  console.log(created ? 'Provisioned.' : 'Already provisioned.')
}

async function listAllowlist() {
  const allowlist = await fetchAllowlist()
  if (!allowlist.length) {
    console.log('Allowlist is empty.')
    return
  }
  const existingEmails = await listAuthUserEmails()
  console.log(`Allowlist (${allowlist.length}):`)
  for (const entry of allowlist) {
    const status = existingEmails.has(entry.email) ? 'provisioned' : 'NOT provisioned'
    console.log(`- ${entry.email} [${status}]${entry.note ? ` — ${entry.note}` : ''}`)
  }
}

function shouldLoadLocalSupabaseStatus() {
  return !(process.env.SUPABASE_SERVICE_ROLE_KEY ?? env.SUPABASE_SERVICE_ROLE_KEY)
}

function loadEnv() {
  const envPath = path.resolve(process.cwd(), '.env')
  if (!fs.existsSync(envPath)) return {}
  const result = {}
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const index = trimmed.indexOf('=')
    if (index === -1) continue
    const key = trimmed.slice(0, index).trim()
    const value = trimmed
      .slice(index + 1)
      .trim()
      .replace(/^["']|["']$/g, '')
    result[key] = value
  }
  return result
}

function loadLocalSupabaseStatusEnv() {
  try {
    const output = execFileSync('pnpm', ['exec', 'supabase', 'status', '-o', 'env'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    })
    return parseEnvOutput(output)
  } catch {
    return {}
  }
}

function parseEnvOutput(output) {
  const result = {}
  for (const line of output.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue
    const index = trimmed.indexOf('=')
    const key = trimmed.slice(0, index).trim()
    const value = trimmed
      .slice(index + 1)
      .trim()
      .replace(/^["']|["']$/g, '')
    result[key] = value
  }
  return result
}
