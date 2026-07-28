import { useQuery } from '@tanstack/react-query'
import { EmptyState, Page, PageLoadError, PageSkeleton } from '~/components'
import { useRequiredAccountId } from '~/domains/account/components/AccountIdentityProvider'
import { meQueryOptions } from '~/domains/account/queries'
import type { AuthUser } from '~/domains/account/server/auth-functions'
import { SettingsForm } from './settings/SettingsForm'

export function SettingsPage({ user }: { user: AuthUser | null }) {
  if (!user) {
    return (
      <Page>
        <EmptyState title="Sign in to edit settings">Units, rounding, equipment, and sync state live on your profile.</EmptyState>
      </Page>
    )
  }
  return <AuthedSettings />
}

function AuthedSettings() {
  const userId = useRequiredAccountId()
  const meQuery = useQuery(meQueryOptions(userId))

  if (meQuery.isPending) return <PageSkeleton compact />
  if (meQuery.isError) return <PageLoadError error={meQuery.error} onRetry={() => void meQuery.refetch()} />
  if (!meQuery.data) {
    return (
      <Page>
        <EmptyState title="Profile unavailable">Sign in again to edit settings.</EmptyState>
      </Page>
    )
  }

  return <SettingsForm me={meQuery.data} />
}
