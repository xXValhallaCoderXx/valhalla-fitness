import { Button } from '@mantine/core'
import { Link } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'
import { BrandLockup } from '~/components/atoms'
import type { AppHeaderBackTarget } from './app-navigation'

export function AppHeaderLeading({
  backTarget,
}: {
  backTarget: AppHeaderBackTarget | null
}) {
  if (!backTarget) {
    return (
      <Link
        to="/today"
        aria-label="Sheetless home"
        className="flex min-w-0 items-center justify-self-start"
      >
        <BrandLockup size="sm" />
      </Link>
    )
  }

  return (
    <Button
      component={Link}
      to={backTarget.to}
      aria-label={backTarget.label}
      data-testid="nested-back"
      className="justify-self-start"
      variant="subtle"
      color="neutral"
      size="compact-sm"
      mih={44}
      miw={44}
      px="sm"
      leftSection={<ArrowLeft size={18} aria-hidden="true" />}
    >
      {backTarget.label}
    </Button>
  )
}
