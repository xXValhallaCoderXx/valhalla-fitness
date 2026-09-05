import { vi } from 'vitest'

/**
 * `useTokens()` throws outside `SheetlessThemeProvider`, and the real provider
 * pulls in the session and a React Query profile fetch. Stubbing the one context
 * hook keeps the real token tables and colour resolution under test while
 * skipping that stack.
 *
 * Call at module scope in a component test:
 *   vi.mock('@/lib/theme-provider', () => themeProviderMock())
 */
export function themeProviderMock(scheme: 'light' | 'dark' = 'dark') {
  return {
    useSheetlessTheme: () => ({
      effectiveScheme: scheme,
      preference: 'system' as const,
      previewPreference: null,
      setPreviewPreference: vi.fn(),
      isThemeReady: true,
    }),
  }
}
