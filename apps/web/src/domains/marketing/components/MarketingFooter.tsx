import { Anchor, Box } from '@mantine/core'
import { Link } from '@tanstack/react-router'
import { BrandLockup, Caption, SectionLabel, Text } from '~/components'
import { footerLegal, footerNav } from '~/domains/marketing/lib/marketing-content'

export function MarketingFooter() {
  return (
    <Box
      component="footer"
      bg="var(--mantine-color-body)"
      className="px-4 py-10 md:px-6"
      style={{ borderTop: '1px solid var(--mantine-color-default-border)' }}
    >
      <div className="mx-auto max-w-[1180px]">
        <div className="flex flex-col gap-8 md:flex-row md:justify-between">
          <div className="max-w-xs">
            <a href="#top" aria-label="Sheetless home">
              <BrandLockup size="md" />
            </a>
            <Text component="p" tone="dimmed" size="sm" fw={600} mt="sm">
              Beginner-friendly strength training with transparent progression — without the spreadsheet maintenance.
            </Text>
          </div>

          <div className="flex flex-wrap gap-10 sm:gap-16">
            {footerNav.map((group) => (
              <div key={group.title} className="flex flex-col gap-2.5">
                <SectionLabel>{group.title}</SectionLabel>
                {group.links.map((link) =>
                  'to' in link ? (
                    <Anchor
                      key={link.label}
                      component={Link}
                      to={link.to}
                      underline="never"
                      fz="sm"
                      fw={600}
                      c="var(--mantine-color-dimmed)"
                      className="vf-nav-link"
                    >
                      {link.label}
                    </Anchor>
                  ) : (
                    <Anchor
                      key={link.label}
                      href={link.href}
                      underline="never"
                      fz="sm"
                      fw={600}
                      c="var(--mantine-color-dimmed)"
                      className="vf-nav-link"
                    >
                      {link.label}
                    </Anchor>
                  ),
                )}
              </div>
            ))}
          </div>
        </div>

        <div
          className="mt-8 flex flex-col gap-2 pt-6 sm:flex-row sm:items-center sm:justify-between"
          style={{ borderTop: '1px solid var(--mantine-color-default-border)' }}
        >
          <Caption fw={600}>{footerLegal.copyright}</Caption>
          <Caption fw={600}>{footerLegal.tagline}</Caption>
        </div>
      </div>
    </Box>
  )
}
