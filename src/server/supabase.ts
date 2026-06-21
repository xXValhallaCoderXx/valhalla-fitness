import { createServerClient } from '@supabase/ssr'
import { getCookies, setCookie } from '@tanstack/react-start/server'

function firstUsableEnvValue(...values: Array<string | undefined>) {
  return values.map((value) => value?.trim()).find((value): value is string => Boolean(value))
}

function isHttpUrl(value: string) {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

function getRawSupabaseUrl() {
  return firstUsableEnvValue(process.env.SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_URL)
}

function getRawSupabaseAnonKey() {
  return firstUsableEnvValue(process.env.SUPABASE_ANON_KEY, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
}

export function hasSupabaseEnv() {
  return Boolean(getSupabaseUrl() && getSupabaseAnonKey())
}

export function getSupabaseUrl() {
  const url = getRawSupabaseUrl()
  return url && isHttpUrl(url) ? url : undefined
}

export function getSupabaseAnonKey() {
  return getRawSupabaseAnonKey()
}

export function getSupabaseServerClient() {
  const url = getSupabaseUrl()
  const anonKey = getSupabaseAnonKey()
  if (!url) {
    throw new Error('Supabase URL is missing or invalid. Set SUPABASE_URL to a valid http(s) URL.')
  }
  if (!anonKey) {
    throw new Error('Supabase anon key is missing. Set SUPABASE_ANON_KEY.')
  }

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return Object.entries(getCookies()).map(([name, value]) => ({
          name,
          value,
        }))
      },
      setAll(cookies) {
        cookies.forEach((cookie) => {
          setCookie(cookie.name, cookie.value, {
            path: '/',
            sameSite: 'lax',
            secure: process.env.NODE_ENV === 'production',
          })
        })
      },
    },
  })
}
