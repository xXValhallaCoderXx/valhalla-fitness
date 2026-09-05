import { useEffect } from 'react'
import { ActionIcon, useComputedColorScheme } from '@mantine/core'
import { Moon, Sun } from 'lucide-react'

const STORAGE_KEY = 'sheetless-marketing-theme'

/**
 * Drives the app-wide color scheme via the same `sheetless-theme-preview` event
 * that Settings uses (see AppRootDocument). The default color-scheme manager is a
 * no-op, so this event — not `setColorScheme` — is what actually flips the theme,
 * and it works for logged-out marketing visitors. The choice is persisted to
 * localStorage and re-applied on mount so it survives reloads.
 */
function applyPreference(preference: 'light' | 'dark') {
  window.dispatchEvent(new CustomEvent('sheetless-theme-preview', { detail: preference }))
}

export function MarketingThemeToggle() {
  const computed = useComputedColorScheme('light', { getInitialValueInEffect: true })

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (stored === 'light' || stored === 'dark') applyPreference(stored)
  }, [])

  const next = computed === 'dark' ? 'light' : 'dark'

  const toggle = () => {
    window.localStorage.setItem(STORAGE_KEY, next)
    applyPreference(next)
  }

  return (
    <ActionIcon
      variant="default"
      size="lg"
      radius="md"
      aria-label={`Switch to ${next} mode`}
      onClick={toggle}
    >
      {computed === 'dark' ? (
        <Sun color="currentColor" size={17} />
      ) : (
        <Moon color="currentColor" size={17} />
      )}
    </ActionIcon>
  )
}
