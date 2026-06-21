import { useMutation, useSuspenseQuery } from '@tanstack/react-query'
import { notifications } from '@mantine/notifications'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useState } from 'react'
import { getApiErrorMessage } from '~/lib/api-error'
import { meQueryOptions } from '~/lib/query-options'
import { signOutFn } from '~/server/auth'
import { updateSettingsFn } from '~/server/api'
import type { Unit } from '~/types/training'
import { Button, Card, EmptyState, Page, PageHeader, TextInput } from '~/components/ui'

const equipmentOptions = [
  'barbell',
  'plates',
  'rack',
  'bench',
  'dumbbells',
  'cable',
  'machine',
  'bodyweight',
  'specialty_bars',
]

export const Route = createFileRoute('/settings')({
  loader: async ({ context }) => {
    if ((context as any).user) await context.queryClient.ensureQueryData(meQueryOptions())
  },
  component: SettingsRoute,
})

function SettingsRoute() {
  const user = (Route.useRouteContext() as any).user
  if (!user) {
    return (
      <Page>
        <EmptyState title="Sign in to edit settings">Units, rounding, equipment, and sync state live on your profile.</EmptyState>
      </Page>
    )
  }
  return <AuthedSettings />
}

function AuthedSettings() {
  const router = useRouter()
  const { data: me } = useSuspenseQuery(meQueryOptions())
  const [units, setUnits] = useState<Unit>(me?.units ?? 'kg')
  const [rounding, setRounding] = useState(me?.rounding ?? 2.5)
  const [autoStartTimer, setAutoStartTimer] = useState(Boolean(me?.autoStartTimer ?? true))
  const [equipmentProfile, setEquipmentProfile] = useState<string[]>(me?.equipmentProfile ?? [])

  const updateMutation = useMutation({
    mutationFn: () =>
      updateSettingsFn({
        data: {
          units,
          rounding,
          autoStartTimer,
          equipmentProfile,
        },
      }),
    onSuccess: (next) => {
      router.options.context.queryClient.setQueryData(['me'], next)
      notifications.show({ color: 'success', title: 'Settings saved', message: 'Your preferences were updated.' })
    },
    onError: (error) => {
      notifications.show({
        color: 'danger',
        title: 'Could not save settings',
        message: getApiErrorMessage(error, 'Unable to save settings'),
      })
    },
  })

  const signOutMutation = useMutation({
    mutationFn: () => signOutFn(),
    onSuccess: async () => {
      await router.invalidate()
      await router.navigate({ to: '/auth' })
    },
    onError: (error) => {
      notifications.show({
        color: 'danger',
        title: 'Could not sign out',
        message: getApiErrorMessage(error, 'Unable to sign out'),
      })
    },
  })

  return (
    <Page>
      <PageHeader title="Settings" eyebrow="Account">
        Units, rounding, equipment profile, and sync preferences.
      </PageHeader>
      <div className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
        <Card>
          <h2 className="text-sm font-bold uppercase text-[var(--muted)]">Account</h2>
          <p className="mt-3 text-sm">{me?.email}</p>
          <Button className="mt-4" variant="danger" disabled={signOutMutation.isPending} onClick={() => signOutMutation.mutate()}>
            {signOutMutation.isPending ? 'Signing out...' : 'Sign out'}
          </Button>
        </Card>

        <div className="space-y-4">
          <Card className="space-y-3">
            <h2 className="text-sm font-bold uppercase text-[var(--muted)]">Preferences</h2>
            <div className="grid grid-cols-2 gap-3">
              <label className="grid gap-1">
                <span className="text-xs font-bold uppercase text-[var(--muted)]">Units</span>
                <select
                  className="min-h-11 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3"
                  value={units}
                  onChange={(event) => setUnits(event.target.value as Unit)}
                >
                  <option value="kg">kg</option>
                  <option value="lb">lb</option>
                </select>
              </label>
              <label className="grid gap-1">
                <span className="text-xs font-bold uppercase text-[var(--muted)]">Rounding</span>
                <TextInput type="number" value={rounding} onChange={(event) => setRounding(Number(event.target.value))} />
              </label>
            </div>
            <label className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-3">
              <span>
                <span className="block text-sm font-semibold">Auto-start rest timer</span>
                <span className="text-xs text-[var(--muted)]">Starts after each completed set.</span>
              </span>
              <input type="checkbox" checked={autoStartTimer} onChange={(event) => setAutoStartTimer(event.target.checked)} />
            </label>
          </Card>

          <Card>
            <h2 className="text-sm font-bold uppercase text-[var(--muted)]">Equipment Profile</h2>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {equipmentOptions.map((item) => (
                <label key={item} className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-3">
                  <span className="text-sm font-semibold">{item.replaceAll('_', ' ')}</span>
                  <input
                    type="checkbox"
                    checked={equipmentProfile.includes(item)}
                    onChange={(event) => {
                      setEquipmentProfile((current) =>
                        event.target.checked ? [...current, item] : current.filter((value) => value !== item),
                      )
                    }}
                  />
                </label>
              ))}
            </div>
            <Button className="mt-4 w-full" disabled={updateMutation.isPending} onClick={() => updateMutation.mutate()}>
              {updateMutation.isPending ? 'Saving...' : 'Save changes'}
            </Button>
          </Card>

          <Card>
            <h2 className="text-sm font-bold uppercase text-[var(--muted)]">Data & Sync</h2>
            <p className="mt-2 text-sm text-[var(--muted)]">Sync status: current browser session. Export is a future module.</p>
          </Card>
        </div>
      </div>
    </Page>
  )
}
