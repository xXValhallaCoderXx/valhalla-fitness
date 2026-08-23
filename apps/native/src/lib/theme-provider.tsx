import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useColorScheme } from 'react-native'
import type { ThemePreference } from '@sheetless/domain/account/types'
import { useMe } from '@/lib/account'
import { useSession } from '@/lib/session-provider'

type EffectiveScheme = 'light' | 'dark'

type SheetlessThemeContextValue = {
  effectiveScheme: EffectiveScheme
  isThemeReady: boolean
  previewPreference: ThemePreference | null
  setPreviewPreference: (value: ThemePreference | null) => void
}

type PreviewState = {
  userId: string | null
  preference: ThemePreference
}

const SheetlessThemeContext = createContext<SheetlessThemeContextValue | null>(null)
const THEME_LOOKUP_TIMEOUT_MS = 1_000

export function SheetlessThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme() === 'light' ? 'light' : 'dark'
  const { user } = useSession()
  const profile = useMe()
  const [preview, setPreview] = useState<PreviewState | null>(null)
  const [timedOutUserId, setTimedOutUserId] = useState<string | null>(null)

  const userId = user?.id ?? null
  const previewPreference = preview?.userId === userId ? preview.preference : null

  useEffect(() => {
    setPreview(null)
  }, [userId])

  useEffect(() => {
    if (!userId || !profile.isPending) {
      setTimedOutUserId(null)
      return
    }

    const timeout = setTimeout(() => setTimedOutUserId(userId), THEME_LOOKUP_TIMEOUT_MS)
    return () => clearTimeout(timeout)
  }, [profile.isPending, userId])

  const preference = previewPreference ?? profile.data?.themePreference ?? 'system'
  const effectiveScheme = preference === 'system' ? systemScheme : preference
  // Use a promptly returned saved theme without allowing an offline or stalled
  // profile request to hold the splash indefinitely.
  const isThemeReady = !user || !profile.isPending || timedOutUserId === userId
  const setPreviewPreference = useCallback((nextPreference: ThemePreference | null) => {
    setPreview(nextPreference ? { userId, preference: nextPreference } : null)
  }, [userId])

  const value = useMemo<SheetlessThemeContextValue>(
    () => ({
      effectiveScheme,
      isThemeReady,
      previewPreference,
      setPreviewPreference,
    }),
    [effectiveScheme, isThemeReady, previewPreference, setPreviewPreference],
  )

  return <SheetlessThemeContext.Provider value={value}>{children}</SheetlessThemeContext.Provider>
}

export function useSheetlessTheme() {
  const value = useContext(SheetlessThemeContext)
  if (!value) throw new Error('useSheetlessTheme must be used within SheetlessThemeProvider')
  return value
}
