import { Button, CloseButton } from '@mantine/core'
import { useQuery } from '@tanstack/react-query'
import { Smartphone } from 'lucide-react'
import { useState } from 'react'
import { Caption, Panel, Text } from '~/components'
import { appStoreLinksQueryOptions } from '~/domains/account/queries'

/**
 * Suggests the native app to anyone signing up on a phone.
 *
 * Deliberately advisory: sign-up on mobile web keeps working, and the card can be dismissed. The
 * viewport gate is CSS (`lg:hidden`) rather than `matchMedia` — `/auth` is server-rendered, and a
 * JS breakpoint would resolve differently on the server than on the first client render.
 */
export function MobileAppPrompt() {
  const [dismissed, setDismissed] = useState(false)
  const { data: links } = useQuery(appStoreLinksQueryOptions())

  if (dismissed) return null

  return (
    <div className="mb-4 lg:hidden">
      <Panel
        p="sm"
        data-testid="mobile-app-prompt"
        style={{
          borderColor: 'var(--vf-action-border)',
          backgroundImage: 'linear-gradient(var(--vf-action-soft), var(--vf-action-soft))',
        }}
      >
        <div className="flex items-start gap-3">
          <Smartphone size={18} color="var(--vf-action-text)" className="mt-0.5 shrink-0" />
          <div className="min-w-0 flex-1">
            <Text size="sm" fw={900}>Sheetless works best as an app</Text>
            <Caption mt={2} lh={1.4}>
              {links?.available
                ? 'Logging sets in the gym is smoother on the phone app. You can still sign up here.'
                : 'The phone app is on the way. Sign up here and your account will be waiting for it.'}
            </Caption>
            {links?.available ? (
              <div className="mt-2.5 flex flex-wrap gap-2">
                {links.android ? (
                  <Button component="a" href={links.android} size="xs" rel="noopener noreferrer">
                    Get it on Google Play
                  </Button>
                ) : null}
                {links.ios ? (
                  <Button component="a" href={links.ios} size="xs" variant="default" rel="noopener noreferrer">
                    Download on the App Store
                  </Button>
                ) : null}
              </div>
            ) : null}
          </div>
          <CloseButton
            aria-label="Dismiss app suggestion"
            size="sm"
            onClick={() => setDismissed(true)}
          />
        </div>
      </Panel>
    </div>
  )
}
