import type { ReactNode } from 'react'
import type { Href } from 'expo-router'
import type { User } from '@supabase/supabase-js'
import type { UserProfile } from '@sheetless/domain/account/types'
import { Text } from '@/components'
import { SettingsPage } from './SettingsPage'
import { SettingsProfileBoundary } from './SettingsProfileBoundary'
import { SettingsSaveFooter } from './SettingsSaveFooter'
import { useSettingsEditor } from './useSettingsEditor'
import { useSettingsLeaveGuard } from './useSettingsLeaveGuard'
import type { SettingsSection } from './settings-section-input'
import type { useSettingsDraft } from './useSettingsDraft'

type EditorProps = {
  title: string; section: SettingsSection
  children: (state: { profile: UserProfile; user: User; draft: ReturnType<typeof useSettingsDraft>; disabled: boolean; navigate: (href: Href) => void }) => ReactNode
}
export function SettingsEditor(props: EditorProps) {
  return <SettingsProfileBoundary title={props.title}>{(profile, user) =>
    <LoadedEditor key={user.id} {...props} profile={profile} user={user} />
  }</SettingsProfileBoundary>
}
function LoadedEditor({ title, section, children, profile, user }: EditorProps & { profile: UserProfile; user: User }) {
  const editor = useSettingsEditor(profile, user, section)
  const leave = useSettingsLeaveGuard({ dirty: editor.dirty, pending: editor.saving, onDiscard: editor.discard })
  return <>
    <SettingsPage title={title} onBack={leave.goBack} footer={<SettingsSaveFooter visible={editor.dirty}
      isSaving={editor.saving} hasValidationErrors={editor.invalid} error={editor.error}
      onSave={() => void editor.save()} onDiscard={editor.discard} />}>
      {editor.saved ? <Text tone="success" size="sm">Changes saved.</Text> : null}
      {children({ profile, user, draft: editor.draft, disabled: editor.saving, navigate: leave.navigate })}
    </SettingsPage>
    {leave.dialog}
  </>
}
