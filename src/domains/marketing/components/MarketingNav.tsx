import { Box, Button } from '@mantine/core'
import { Link } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'
import { BrandLockup } from '~/components'

export function MarketingNav() {
  return (
    <Box
      component="header"
      className="sticky top-0 z-50 backdrop-blur-md"
      style={{
        borderBottom: '1px solid var(--mantine-color-default-border)',
        backgroundColor: 'color-mix(in srgb, var(--mantine-color-body) 92%, transparent)',
      }}
    >
      <div className="mx-auto flex h-16 max-w-[1180px] items-center justify-between gap-3 px-4 md:px-6">
        <BrandLockup size="md" />
        <div className="flex items-center gap-2">
          <Button component={Link} to="/auth" variant="default" size="sm" className="hidden sm:inline-flex">
            Sign in
          </Button>
          <Button component={Link} to="/auth" size="sm">
            Get started
            <ArrowRight color="currentColor" size={15} />
          </Button>
        </div>
      </div>
    </Box>
  )
}
