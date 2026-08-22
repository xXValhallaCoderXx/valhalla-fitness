#!/usr/bin/env node
/* global console */

// Print recent beta feedback (feedback_events) with the context that makes it
// actionable: source, clarity answer, category, movement/rule/values, route,
// and the free-text message.
//
// ADMIN / OFFLINE USE ONLY. Requires SUPABASE_SERVICE_ROLE_KEY (the migration
// grants feedback_events SELECT to service_role; emails resolve via the auth
// admin API because profiles carries no service_role grant in this project).
//
// Usage:
//   node scripts/feedback-report.mjs          # last 14 days
//   node scripts/feedback-report.mjs 30       # last 30 days

import { createClient } from '@supabase/supabase-js'
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'

const days = Number.parseInt(process.argv[2] ?? '14', 10)
if (!Number.isFinite(days) || days <= 0) {
  console.error('Usage: node scripts/feedback-report.mjs [days]')
  process.exit(1)
}

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
  await printReport()
} catch (error) {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
}

async function printReport() {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
  const { data, error } = await adminClient
    .from('feedback_events')
    .select('*')
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(500)
  if (error) throw new Error(`Unable to read feedback_events: ${error.message}`)

  const events = data ?? []
  console.log(`Feedback report — last ${days} day${days === 1 ? '' : 's'} (${events.length} event${events.length === 1 ? '' : 's'}${events.length === 500 ? ', capped at 500' : ''})`)
  if (!events.length) return

  const emailByUserId = await mapUserEmails(new Set(events.map((event) => event.user_id)))

  console.log('')
  console.log(`By source:    ${countLine(events.map((event) => event.source))}`)
  const clarity = events.filter((event) => event.source === 'post_workout' && event.answer)
  if (clarity.length) {
    const yes = clarity.filter((event) => event.answer === 'yes').length
    const rate = Math.round((yes / clarity.length) * 100)
    console.log(`Clarity:      ${countLine(clarity.map((event) => event.answer))} — ${rate}% yes`)
  }
  const categorized = events.filter((event) => event.category)
  if (categorized.length) {
    console.log(`By category:  ${countLine(categorized.map((event) => event.category))}`)
  }

  console.log('')
  for (const event of events) {
    const meta = event.metadata ?? {}
    const when = event.created_at.replace('T', ' ').slice(0, 16)
    const who = emailByUserId.get(event.user_id) ?? event.user_id
    const what = [event.answer, event.category].filter(Boolean).join(' / ') || '—'
    console.log(`${when} · ${who} · ${event.source} · ${what}`)
    const context = [
      meta.movementName,
      meta.ruleId ? `rule ${meta.ruleId}` : null,
      meta.previousValue != null && meta.recommendedValue != null ? `${meta.previousValue} → ${meta.recommendedValue}` : null,
      event.route,
    ].filter(Boolean)
    if (context.length) console.log(`  ${context.join(' · ')}`)
    if (event.message) console.log(`  "${event.message}"`)
  }
}

function countLine(values) {
  const counts = new Map()
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1)
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([value, count]) => `${value} ${count}`)
    .join(' · ')
}

async function mapUserEmails(userIds) {
  const emails = new Map()
  for (let page = 1; page < 50; page += 1) {
    const { data, error } = await adminClient.auth.admin.listUsers({ page, perPage: 1000 })
    if (error) throw new Error(`Unable to list auth users: ${error.message}`)
    for (const user of data.users ?? []) {
      if (userIds.has(user.id) && user.email) emails.set(user.id, user.email)
    }
    if (!data.users?.length || data.users.length < 1000) break
  }
  return emails
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
