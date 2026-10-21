import { useState } from 'react'
import { View } from 'react-native'
import { ACCOUNT_DELETE_CONFIRMATION, isAccountDeleteConfirmed } from '@sheetless/domain/account/data-rights'
import { Button, Caption, SheetModal, Text, TextInput } from '@/components'

/** Mounted only while open, so a fresh confirmation starts empty without effect-driven resets. */
export function DeleteAccountSheet({ pending, error, onClose, onConfirm }: {
  pending: boolean; error: string | null; onClose: () => void; onConfirm: (confirmation: string) => void
}) {
  const [confirmation, setConfirmation] = useState('')
  return <SheetModal open title="Delete your account?" onClose={onClose} closeDisabled={pending}
    footer={<Button label="Delete forever" tone="danger" fullWidth loading={pending}
      disabled={!isAccountDeleteConfirmed(confirmation)} onPress={() => onConfirm(confirmation)} testID="delete-account-submit" />}>
    <Text>This permanently removes your login, profile, programmes, saved workouts, bodyweight history and feedback. It cannot be undone.</Text>
    <Caption>Export first if you want a copy. Enter {ACCOUNT_DELETE_CONFIRMATION} exactly to continue.</Caption>
    <TextInput value={confirmation} onChangeText={setConfirmation} placeholder={ACCOUNT_DELETE_CONFIRMATION}
      accessibilityLabel="Account deletion confirmation" autoCapitalize="characters" autoComplete="off"
      editable={!pending} testID="delete-account-confirmation" />
    {error ? <View accessibilityLiveRegion="polite"><Text tone="danger">{error}</Text></View> : null}
    <Button label="Keep account" variant="default" disabled={pending} onPress={onClose} />
  </SheetModal>
}
