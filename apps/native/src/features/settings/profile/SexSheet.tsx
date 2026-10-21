import type { User } from '@supabase/supabase-js'
import type { UserProfile } from '@sheetless/domain/account/types'
import { Button, Caption, SegmentedControl, SheetModal, Text } from '@/components'
import { SettingsSaveFooter } from '../SettingsSaveFooter'
import { useSettingsEditor } from '../useSettingsEditor'
import { useSettingsLeaveGuard } from '../useSettingsLeaveGuard'

export function SexSheet({ profile, user, onClose }: { profile: UserProfile; user: User; onClose: () => void }) {
  const editor = useSettingsEditor(profile, user, 'sex')
  const leave = useSettingsLeaveGuard({ dirty: editor.dirty, pending: editor.saving, onDiscard: editor.discard })
  return <>
    <SheetModal open title="Sex" eyebrow="Your body" showHandle closeDisabled={editor.saving}
      onClose={() => leave.request(onClose)} footer={editor.dirty ? <SettingsSaveFooter visible
        isSaving={editor.saving} hasValidationErrors={false} error={editor.error}
        onSave={() => void editor.save()} onDiscard={editor.discard} /> : <Button label="Done" onPress={onClose} />}>
      <Text>This optional value is used for supported strength calculations.</Text>
      <SegmentedControl variant="segments" accessibilityRole="radiogroup" accessibilityLabel="Sex" value={editor.draft.values.sex ?? 'unset'}
        options={[{ value: 'male', label: 'Male' }, { value: 'female', label: 'Female' }, { value: 'unset', label: 'Not set', accessibilityLabel: 'Not set, prefer not to say' }]}
        disabled={editor.saving} onChange={value => editor.draft.setSex(value === 'unset' ? null : value)} />
      <Caption>With enough logged lifting data and bodyweight, male or female enables a DOTS score. Without sex, Insights can show a bodyweight multiple instead. With no bodyweight, it can show your lifting total.</Caption>
      <Caption>Choose Not set if you prefer not to say. You can change this any time. It does not change your training targets.</Caption>
      {editor.saved ? <Text size="sm" tone="success">Changes saved.</Text> : null}
    </SheetModal>
    {leave.dialog}
  </>
}
