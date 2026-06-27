import { Box, Button } from '@mantine/core'
import { Link } from '@tanstack/react-router'
import { BrandLockup, Caption, Text } from '~/components'

export function MarketingFooter() {
  return (
    <Box
      component="footer"
      bg="var(--mantine-color-body)"
      className="px-4 py-6 md:px-6"
      style={{ borderTop: '1px solid var(--mantine-color-default-border)' }}
    >
      <div className="mx-auto flex max-w-[1180px] flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <BrandLockup />
          <Text component="p" tone="dimmed" size="sm" fw={600} mt="xs">
            Beginner-friendly strength training with transparent progression.
          </Text>
        </div>
        <div className="flex items-center gap-3">
          <Caption fw={700}>Sheetless</Caption>
          <Button component={Link} to="/auth" variant="subtle" size="compact-sm">
            Sign in
          </Button>
        </div>
      </div>
    </Box>
  )
}

