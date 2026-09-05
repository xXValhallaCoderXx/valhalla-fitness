import { Anchor, Box, Button, Divider } from '@mantine/core'
import { Link } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { BrandLockup, Caption, Heading, Panel, Text } from '~/components'

export const LEGAL_CONTACT_EMAIL = 'privacy@sheetless.fitness'

export function LegalDocument({
  title,
  summary,
  children,
}: {
  title: string
  summary: string
  children: ReactNode
}) {
  return (
    <Box bg="var(--mantine-color-body)" className="min-h-dvh">
      <Box
        component="header"
        bg="var(--mantine-color-default)"
        style={{ borderBottom: '1px solid var(--mantine-color-default-border)' }}
      >
        <div className="mx-auto flex h-16 max-w-[960px] items-center justify-between gap-4 px-4 md:px-6">
          <Anchor component={Link} to="/" underline="never" aria-label="Sheetless home">
            <BrandLockup size="md" />
          </Anchor>
          <Button component={Link} to="/auth" variant="default" size="sm">
            Sign in
          </Button>
        </div>
      </Box>

      <Box component="main" className="mx-auto max-w-[800px] px-4 py-8 md:px-6 md:py-12">
        <Panel p={{ base: 'md', sm: 'xl' }}>
          <Caption component="p" fw={800} tt="uppercase">Effective July 28, 2026</Caption>
          <Heading order={1} size="2.25rem" lh={1.08} mt="xs">{title}</Heading>
          <Text component="p" size="lg" tone="dimmed" lh={1.6} mt="md">
            {summary}
          </Text>
          <Divider my="xl" />
          <div className="grid gap-8">{children}</div>
        </Panel>
      </Box>

      <Box
        component="footer"
        className="px-4 py-8 md:px-6"
        style={{ borderTop: '1px solid var(--mantine-color-default-border)' }}
      >
        <div className="mx-auto flex max-w-[800px] flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Caption component="p">© 2026 Sheetless</Caption>
          <div className="flex flex-wrap gap-4">
            <Anchor component={Link} to="/account-deletion" size="sm">Delete account</Anchor>
            <Anchor component={Link} to="/privacy" size="sm">Privacy</Anchor>
            <Anchor component={Link} to="/terms" size="sm">Terms</Anchor>
            <Anchor href={`mailto:${LEGAL_CONTACT_EMAIL}`} size="sm">Contact</Anchor>
          </div>
        </div>
      </Box>
    </Box>
  )
}

export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <Heading order={2} size="lg">{title}</Heading>
      <div className="mt-3 grid gap-3">{children}</div>
    </section>
  )
}

export function LegalList({ items }: { items: ReactNode[] }) {
  return (
    <Box component="ul" className="grid list-disc gap-2 pl-5">
      {items.map((item, index) => (
        <Text component="li" size="sm" tone="dimmed" lh={1.6} key={index}>
          {item}
        </Text>
      ))}
    </Box>
  )
}
