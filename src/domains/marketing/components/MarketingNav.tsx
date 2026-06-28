import { Anchor, Box, Button } from '@mantine/core'
import { Link } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'
import { BrandLockup } from '~/components'
import { marketingNavLinks } from '~/domains/marketing/lib/marketing-content'

export function MarketingNav() {
  return (
    <Box
      component="header"
      className="sticky top-0 z-50 backdrop-blur-md"
      style={{
        borderBottom: '1px solid var(--mantine-color-default-border)',
        backgroundColor: 'color-mix(in srgb, var(--mantine-color-body) 88%, transparent)',
      }}
    >
      <div className="mx-auto flex h-16 max-w-[1180px] items-center justify-between gap-3 px-4 md:px-6">
        <a href="#top" aria-label="Sheetless home">
          <BrandLockup size="md" />
        </a>

        <nav className="flex items-center gap-1">
          <div className="mr-2 hidden items-center gap-1 md:flex">
            {marketingNavLinks.map((link) => (
              <Anchor
                key={link.href}
                href={link.href}
                underline="never"
                fz="sm"
                fw={600}
                c="var(--mantine-color-dimmed)"
                className="vf-nav-link rounded-md px-3 py-2"
              >
                {link.label}
              </Anchor>
            ))}
          </div>
          <Button component={Link} to="/auth" variant="default" size="sm" className="hidden sm:inline-flex">
            Sign in
          </Button>
          <Button component={Link} to="/auth" size="sm">
            Get started
            <ArrowRight color="currentColor" size={15} />
          </Button>
        </nav>
      </div>
    </Box>
  )
}
