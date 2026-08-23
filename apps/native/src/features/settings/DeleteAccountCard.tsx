import { useState } from 'react'
import { Modal, Pressable, View } from 'react-native'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { deleteOwnAccount } from '@sheetless/data/account/data-rights'
import { ACCOUNT_DELETE_CONFIRMATION } from '@sheetless/domain/account/data-rights'
import { getApiErrorMessage } from '@sheetless/domain/shared/api-error'
import { Button, Caption, Heading, Panel, SectionLabel, Text, TextInput } from '@/components'
import { buildUserContext } from '@/lib/account'
import { useSession } from '@/lib/session-provider'
import { getSupabase } from '@/lib/supabase'
import { cardShadow, radii, spacing, useTokens } from '@/lib/tokens'

export function DeleteAccountCard() {
  const { user } = useSession()
  const { theme } = useTokens()
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [confirmation, setConfirmation] = useState('')

  const deletion = useMutation({
    mutationFn: () =>
      deleteOwnAccount(buildUserContext(user!), { confirmation: ACCOUNT_DELETE_CONFIRMATION }),
    onSuccess: async () => {
      queryClient.clear()
      // The auth identity has already been removed, so remote sign-out can fail;
      // local session teardown is still required and is best-effort.
      await getSupabase().auth.signOut({ scope: 'local' }).catch(() => undefined)
    },
  })

  const close = () => {
    if (deletion.isPending) return
    setOpen(false)
    setConfirmation('')
    deletion.reset()
  }

  return (
    <>
      <Panel style={{ gap: spacing.sm, padding: spacing.md }}>
        <SectionLabel tone="danger">Danger zone</SectionLabel>
        <Text size="sm" weight={800}>Delete account</Text>
        <Caption>Permanently remove your login and all training data. This cannot be undone.</Caption>
        <Button label="Delete account" tone="danger" variant="light" onPress={() => setOpen(true)} />
      </Panel>

      <Modal visible={open} transparent animationType="fade" onRequestClose={close}>
        <Pressable
          onPress={deletion.isPending ? undefined : close}
          style={{
            backgroundColor: 'rgba(6, 12, 14, 0.65)',
            flex: 1,
            justifyContent: 'center',
            padding: spacing.lg,
          }}
        >
          <Pressable onPress={() => {}} style={{ cursor: 'auto' }}>
            <View
              style={{
                backgroundColor: theme.surface,
                borderColor: theme.tones.danger.border,
                borderRadius: radii.lg,
                borderWidth: 1,
                gap: spacing.sm,
                padding: spacing.lg,
                ...cardShadow(theme),
              }}
            >
              <Heading order={2}>Delete your Sheetless account?</Heading>
              <Text size="sm" tone="dimmed">
                Every workout, program, preference, and your sign-in identity will be permanently deleted.
              </Text>
              <Text size="sm">
                Enter <Text size="sm" weight={900}>{ACCOUNT_DELETE_CONFIRMATION}</Text> exactly to continue.
              </Text>
              <TextInput
                value={confirmation}
                onChangeText={setConfirmation}
                placeholder={ACCOUNT_DELETE_CONFIRMATION}
                editable={!deletion.isPending}
                autoCapitalize="characters"
                testID="delete-account-confirmation"
              />
              {deletion.isError ? (
                <Text size="sm" tone="danger">
                  {getApiErrorMessage(deletion.error, 'Unable to delete your account.')}
                </Text>
              ) : null}
              <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                <View style={{ flex: 1 }}>
                  <Button
                    label="Cancel"
                    variant="default"
                    fullWidth
                    disabled={deletion.isPending}
                    onPress={close}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Button
                    label="Delete forever"
                    tone="danger"
                    fullWidth
                    loading={deletion.isPending}
                    disabled={confirmation !== ACCOUNT_DELETE_CONFIRMATION}
                    onPress={() => deletion.mutate()}
                    testID="delete-account-submit"
                  />
                </View>
              </View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  )
}
