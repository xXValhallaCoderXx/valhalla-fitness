import { Anchor, Button } from '@mantine/core'
import { Link } from '@tanstack/react-router'
import { Caption, Panel, SectionLabel, Text } from '~/components'
import {
  LEGAL_CONTACT_EMAIL,
  LegalDocument,
  LegalList,
  LegalSection,
} from './LegalDocument'

export function AccountDeletionPage() {
  return (
    <LegalDocument
      title="Delete your Sheetless account"
      summary="Sheetless gives every account owner a direct way to permanently delete their login and associated training data."
    >
      <Panel
        p={{ base: 'md', sm: 'lg' }}
        style={{
          backgroundColor: 'var(--vf-danger-soft)',
          borderColor: 'var(--vf-danger-border)',
        }}
      >
        <SectionLabel tone="danger">Account deletion pathway</SectionLabel>
        <ol className="mt-3 grid list-decimal gap-2 pl-5">
          <Text component="li" size="sm" fw={700}>Sign in to your Sheetless account.</Text>
          <Text component="li" size="sm" fw={700}>Open Settings.</Text>
          <Text component="li" size="sm" fw={700}>Choose Delete account.</Text>
          <Text component="li" size="sm" fw={700}>
            Enter <span className="whitespace-nowrap">DELETE MY ACCOUNT</span> exactly and confirm permanent deletion.
          </Text>
        </ol>
        <Button component={Link} to="/auth" color="danger" mt="lg">
          Sign in to delete account
        </Button>
      </Panel>

      <LegalSection title="What deletion removes">
        <LegalList
          items={[
            'Your Sheetless authentication identity and profile.',
            'Your custom programs, workout history, set logs, progression decisions, bodyweight entries, favorites, and feedback.',
            'Access to the account immediately after the deletion succeeds.',
          ]}
        />
        <Text component="p" size="sm" tone="dimmed" lh={1.6}>
          Deletion is permanent and cannot be undone. Export your data from Settings first if you
          want to retain a copy. Limited information may remain temporarily in provider backups,
          security logs, or records that must be retained for legal purposes, as described in the{' '}
          <Anchor component={Link} to="/privacy">Privacy Policy</Anchor>.
        </Text>
      </LegalSection>

      <LegalSection title="Cannot sign in?">
        <Text component="p" size="sm" tone="dimmed" lh={1.6}>
          Email <Anchor href={`mailto:${LEGAL_CONTACT_EMAIL}`}>{LEGAL_CONTACT_EMAIL}</Anchor> from
          the address associated with your Sheetless account to request deletion. We may ask you to
          verify account ownership before completing the request.
        </Text>
        <Caption component="p">
          This public page is the account-deletion resource for the Sheetless Android app.
        </Caption>
      </LegalSection>
    </LegalDocument>
  )
}
