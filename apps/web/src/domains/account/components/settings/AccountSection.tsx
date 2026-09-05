import { Anchor, Button, TextInput } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { useMutation } from '@tanstack/react-query'
import { Link, useRouter } from '@tanstack/react-router'
import { FileText, LogOut, ShieldCheck, Trash2, User } from 'lucide-react'
import { useState } from 'react'
import { Caption, Panel, SectionLabel, Text } from '~/components'
import { authUserQueryOptions } from '~/domains/account/queries'
import { signOutFn } from '~/domains/account/server/auth-functions'
import { deleteOwnAccountFn } from '~/domains/account/server/data-rights-functions'
import { useSignOut } from '~/domains/account/useSignOut'
import { transitionAccountCache } from '~/shared/lib/account-cache'
import { getApiErrorMessage } from '~/shared/lib/api-error'
import { DeleteAccountDialog } from './DeleteAccountDialog'
import { SettingsSection } from './SettingsSection'

export function AccountSection({ email }: { email: string }) {
  const router = useRouter()
  const signOutMutation = useSignOut()
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const deleteMutation = useMutation({
    mutationFn: async (confirmation: string) => {
      const result = await deleteOwnAccountFn({ data: { confirmation } })
      // The identity has already been removed, so cookie cleanup is best-effort:
      // a missing-user response is expected and must not block local teardown.
      await signOutFn().catch(() => ({ ok: false as const }))
      return result
    },
    onSuccess: async () => {
      const queryClient = router.options.context.queryClient
      await transitionAccountCache(queryClient, null)
      queryClient.setQueryData(authUserQueryOptions().queryKey, null)
      await router.invalidate().catch(() => undefined)
      notifications.show({
        color: 'success',
        title: 'Account deleted',
        message: 'Your Sheetless account and training data were permanently deleted.',
      })
      await router.navigate({ to: '/auth', replace: true })
    },
    onError: (error) => {
      notifications.show({
        color: 'danger',
        title: 'Could not delete account',
        message: getApiErrorMessage(error, 'Unable to delete your account'),
      })
    },
  })

  return (
    <SettingsSection
      id="account"
      icon={User}
      title="Account"
      description="Login identity and session controls."
    >
      <div className="grid gap-3">
        <Panel p="md">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <label className="grid min-w-0 gap-1 sm:flex-1">
              <SectionLabel>Email Address</SectionLabel>
              <TextInput type="email" value={email} readOnly />
            </label>
            <Button
              className="w-full sm:w-auto sm:shrink-0"
              color="danger"
              variant="light"
              disabled={signOutMutation.isPending}
              onClick={() => signOutMutation.mutate()}
            >
              <LogOut size={14} />
              {signOutMutation.isPending ? 'Signing out...' : 'Sign out'}
            </Button>
          </div>
        </Panel>

        <Panel p="md">
          <SectionLabel>Legal & privacy</SectionLabel>
          <div className="mt-2 flex flex-wrap gap-x-5 gap-y-2">
            <Anchor component={Link} to="/account-deletion" size="sm" fw={700}>
              <Trash2 size={14} className="mr-1 inline" />
              Account deletion
            </Anchor>
            <Anchor component={Link} to="/privacy" size="sm" fw={700}>
              <ShieldCheck size={14} className="mr-1 inline" />
              Privacy policy
            </Anchor>
            <Anchor component={Link} to="/terms" size="sm" fw={700}>
              <FileText size={14} className="mr-1 inline" />
              Terms of use
            </Anchor>
          </div>
        </Panel>

        <Panel p="md">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <Text component="p" size="sm" fw={800}>Delete account</Text>
              <Caption component="p" mt={2}>
                Permanently remove your login and all training data.
              </Caption>
            </div>
            <Button
              className="w-full sm:w-auto sm:shrink-0"
              color="danger"
              variant="light"
              leftSection={<Trash2 size={14} />}
              onClick={() => setDeleteDialogOpen(true)}
            >
              Delete account
            </Button>
          </div>
        </Panel>
      </div>

      <DeleteAccountDialog
        opened={deleteDialogOpen}
        isPending={deleteMutation.isPending}
        onClose={() => {
          if (!deleteMutation.isPending) setDeleteDialogOpen(false)
        }}
        onConfirm={(confirmation) => deleteMutation.mutate(confirmation)}
      />
    </SettingsSection>
  )
}
