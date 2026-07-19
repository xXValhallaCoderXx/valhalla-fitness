import { createFileRoute } from '@tanstack/react-router'
import { getProfile } from '~/domains/account/server/profile-functions'
import { handleApiRequest } from '~/shared/server/api-route'

export const Route = createFileRoute('/api/v1/me')({
  server: {
    handlers: {
      GET: async ({ request }) =>
        handleApiRequest(request, async ({ context }) => {
          const profile = await getProfile(context!)
          return {
            id: profile.id,
            email: profile.email,
            displayName: profile.displayName ?? null,
            units: profile.units,
            rounding: profile.rounding,
            themePreference: profile.themePreference,
            autoStartTimer: profile.autoStartTimer,
            defaultRestSeconds: profile.defaultRestSeconds,
          }
        }),
    },
  },
})
