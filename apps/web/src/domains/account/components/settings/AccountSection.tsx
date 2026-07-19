import { Button, TextInput } from '@mantine/core'
import { LogOut, User } from 'lucide-react'
import { Panel, SectionLabel } from '~/components'
import { useSignOut } from '~/domains/account/useSignOut'
import { SettingsSection } from './SettingsSection'

export function AccountSection({ email }: { email: string }) {
  const signOutMutation = useSignOut()
  return (
    <SettingsSection
      id="account"
      icon={User}
      title="Account"
      description="Login identity and session controls."
    >
      <Panel p="md">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <label className="grid min-w-0 gap-1 sm:flex-1">
            <SectionLabel>Email Address</SectionLabel>
            <TextInput type="email" value={email} readOnly />
          </label>
          <Button className="w-full sm:w-auto sm:shrink-0" color="danger" variant="light" disabled={signOutMutation.isPending} onClick={() => signOutMutation.mutate()}>
            <LogOut size={14} />
            {signOutMutation.isPending ? 'Signing out...' : 'Sign out'}
          </Button>
        </div>
      </Panel>
    </SettingsSection>
  )
}
