import { useState } from 'react'
import { View } from 'react-native'
import * as WebBrowser from 'expo-web-browser'
import { Button, Caption, Panel, SectionLabel, Text } from '@/components'
import { spacing } from '@/lib/tokens'
import { SettingsSection } from './SettingsSection'

const WEB_ORIGIN = 'https://www.sheetless.fitness'

export function AccountSection({
  displayName,
  email,
  signingOut,
  signOutError,
  destructiveDisabled,
  onSignOut,
  onDelete,
}: {
  displayName: string | null | undefined
  email: string | null
  signingOut: boolean
  signOutError: string | null
  destructiveDisabled: boolean
  onSignOut: () => void
  onDelete: () => void
}) {
  const [legalError, setLegalError] = useState<string | null>(null)
  const openLegal = async (path: string) => {
    setLegalError(null)
    try {
      await WebBrowser.openBrowserAsync(`${WEB_ORIGIN}${path}`)
    } catch (error) {
      setLegalError(error instanceof Error ? error.message : 'Unable to open that page.')
    }
  }

  return (
    <SettingsSection title="Account" description="Your sign-in identity, legal information, and account controls.">
      <View style={{ gap: spacing.sm }}>
        <Panel style={{ gap: spacing.sm, padding: spacing.md }}>
          <SectionLabel>Signed in as</SectionLabel>
          <Text weight={800}>{displayName?.trim() || 'Sheetless member'}</Text>
          <Text size="sm" tone="dimmed" selectable>{email ?? 'No email address'}</Text>
          <Caption>Your identity is read-only in the app.</Caption>
          {signOutError ? <Text size="sm" tone="danger">{signOutError}</Text> : null}
          <Button
            label={signingOut ? 'Signing out…' : 'Sign out'}
            variant="default"
            loading={signingOut}
            disabled={destructiveDisabled}
            onPress={onSignOut}
            testID="settings-sign-out"
          />
        </Panel>

        <Panel style={{ gap: spacing.sm, padding: spacing.md }}>
          <SectionLabel>Legal & privacy</SectionLabel>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
            <Button label="Privacy" variant="subtle" onPress={() => void openLegal('/privacy')} />
            <Button label="Terms" variant="subtle" onPress={() => void openLegal('/terms')} />
            <Button
              label="Deletion information"
              variant="subtle"
              onPress={() => void openLegal('/account-deletion')}
            />
          </View>
          {legalError ? <Text size="sm" tone="danger">{legalError}</Text> : null}
        </Panel>

        <Panel style={{ gap: spacing.sm, padding: spacing.md }}>
          <SectionLabel tone="danger">Danger zone</SectionLabel>
          <Text size="sm" weight={800}>Delete account</Text>
          <Caption>Permanently remove your login and all Sheetless training data.</Caption>
          <Button
            label="Delete account"
            tone="danger"
            variant="light"
            disabled={destructiveDisabled}
            onPress={onDelete}
            testID="settings-delete-account"
          />
        </Panel>
      </View>
    </SettingsSection>
  )
}
