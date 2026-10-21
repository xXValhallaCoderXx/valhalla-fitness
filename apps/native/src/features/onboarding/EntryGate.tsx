import { Fragment, type ReactNode } from 'react'
import { Redirect, useGlobalSearchParams, useIsFocused, usePathname, useRootNavigationState, type Href } from 'expo-router'
import { Button, Panel, Screen, Text } from '@/components'
import { useMe } from '@/lib/account'
import { getEntryDestination } from '@/lib/entry-destination'
import { useSession } from '@/lib/session-provider'
import { spacing } from '@/lib/tokens'

/** Runs inside a mounted root navigator, before protected route content is rendered. */
export function EntryGate({ children }: { children: ReactNode }) {
  const { status, user } = useSession()
  const profile = useMe()
  const pathname = usePathname()
  const params = useGlobalSearchParams()
  const focused = useIsFocused()
  const navigation = useRootNavigationState()
  const inAuth = pathname === '/auth'
  const inFirstRun = pathname === '/first-run'
  const next = getEntryDestination(pathname, params)

  if (status === 'restoring' || !navigation?.key) return <EntryLoading />
  if (status === 'signedOut') {
    if (inAuth) return focused ? <Fragment key="signed-out">{children}</Fragment> : null
    return focused ? <Redirect href={{ pathname: '/auth', params: { next } }} /> : null
  }

  // Cached profile data is usable through a background refresh failure, but only for its actor.
  if (!user || !profile.data || profile.data.id !== user.id) {
    if (profile.isError || (profile.data && profile.data.id !== user?.id)) return <Screen>
      <Panel style={{ padding: spacing.md, gap: spacing.sm }}>
        <Text weight={800}>Your profile could not load</Text>
        <Text size="sm" tone="dimmed">Check your connection, then try again. You are still signed in.</Text>
        <Button label="Retry" loading={profile.isFetching} onPress={() => void profile.refetch()} />
      </Panel>
    </Screen>
    return <EntryLoading />
  }

  if (!profile.data.onboardingCompleted) {
    if (inFirstRun) return focused ? <Fragment key={user.id}>{children}</Fragment> : null
    return focused ? <Redirect href={{ pathname: '/first-run', params: { next } }} /> : null
  }
  if (inAuth || inFirstRun) return focused ? <Redirect href={next as Href} /> : null
  return <Fragment key={user.id}>{children}</Fragment>
}

function EntryLoading() {
  return <Screen><Panel style={{ padding: spacing.md }}><Text tone="dimmed">Loading your profile…</Text></Panel></Screen>
}

export function entryScreenLayout({ children }: { children: ReactNode }) {
  return <EntryGate>{children}</EntryGate>
}
