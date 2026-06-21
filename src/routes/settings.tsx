import { useMutation, useSuspenseQuery } from '@tanstack/react-query'
import { notifications } from '@mantine/notifications'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import { Cloud, Dumbbell, LogOut, SlidersHorizontal, User } from 'lucide-react'
import { useState } from 'react'
import { getApiErrorMessage } from '~/lib/api-error'
import { meQueryOptions } from '~/lib/query-options'
import { signOutFn } from '~/server/auth'
import { updateSettingsFn } from '~/server/api'
import type { Unit } from '~/types/training'
import { Button, Card, Chip, EmptyState, Page, PageHeader, TextInput } from '~/components/ui'

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
      <PageHeader title="Settings" eyebrow="Account" actions={<Chip tone="success">Synced</Chip>}>
        Units, rounding, equipment profile, and sync preferences.
      </PageHeader>
      <div className="grid gap-4 lg:grid-cols-[11rem_minmax(0,1fr)]">
        <aside className="hidden rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] p-3 shadow-[var(--shadow-card)] lg:flex lg:flex-col">
          <p className="vf-section-label px-2 pb-2">Settings</p>
          {[
            { label: 'Account', icon: User, active: true },
            { label: 'Preferences', icon: SlidersHorizontal },
            { label: 'Equipment', icon: Dumbbell },
            { label: 'Data & Sync', icon: Cloud },
          ].map((item) => {
            const Icon = item.icon
            return (
              <div key={item.label} className={`flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-semibold ${item.active ? 'border border-[var(--border)] bg-[var(--surface-2)] text-[var(--text)]' : 'text-[var(--muted)]'}`}>
                <Icon size={14} className={item.active ? 'text-[var(--action)]' : undefined} />
                {item.label}
              </div>
            )
          })}
          <Button className="mt-auto" variant="danger" disabled={signOutMutation.isPending} onClick={() => signOutMutation.mutate()}>
            <LogOut size={14} />
            {signOutMutation.isPending ? 'Signing out...' : 'Sign out'}
          </Button>
        </aside>

        <div className="space-y-5">
          <section>
            <div className="mb-2">
              <h2 className="text-sm font-extrabold">Account Details</h2>
              <p className="text-[10px] text-[var(--muted)]">Manage your profile and login identity.</p>
            </div>
            <Card className="space-y-3">
              <label className="grid gap-1">
                <span className="vf-section-label">Email Address</span>
                <TextInput type="email" value={me?.email ?? ''} readOnly />
              </label>
              <Button className="w-full lg:hidden" variant="danger" disabled={signOutMutation.isPending} onClick={() => signOutMutation.mutate()}>
                <LogOut size={14} />
                {signOutMutation.isPending ? 'Signing out...' : 'Sign out'}
              </Button>
            </Card>
          </section>

          <section>
            <div className="mb-2">
              <h2 className="text-sm font-extrabold">Preferences</h2>
              <p className="text-[10px] text-[var(--muted)]">Units, rounding, and session defaults.</p>
            </div>
            <Card className="space-y-3">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="grid gap-1">
                  <span className="vf-section-label">Units</span>
                  <select
                    className="min-h-11 rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--surface-2)] px-3 font-medium"
                    value={units}
                    onChange={(event) => setUnits(event.target.value as Unit)}
                  >
                    <option value="kg">kg</option>
                    <option value="lb">lb</option>
                  </select>
                </label>
                <label className="grid gap-1">
                  <span className="vf-section-label">Rounding</span>
                  <TextInput type="number" value={rounding} onChange={(event) => setRounding(Number(event.target.value))} />
                </label>
              </div>
              <label className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3">
                <span>
                  <span className="block text-sm font-semibold">Auto-start rest timer</span>
                  <span className="text-xs text-[var(--muted)]">Starts after each completed set.</span>
                </span>
                <input className="h-5 w-5 accent-[var(--action)]" type="checkbox" checked={autoStartTimer} onChange={(event) => setAutoStartTimer(event.target.checked)} />
              </label>
            </Card>
          </section>

          <section>
            <div className="mb-2">
              <h2 className="text-sm font-extrabold">Equipment Profile</h2>
              <p className="text-[10px] text-[var(--muted)]">Select available equipment to filter alternatives.</p>
            </div>
            <Card>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {equipmentOptions.map((item) => (
                  <label key={item} className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3">
                    <span className="text-sm font-semibold">{item.replaceAll('_', ' ')}</span>
                    <input
                      className="h-4 w-4 accent-[var(--action)]"
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
          </section>

          <section>
            <div className="mb-2">
              <h2 className="text-sm font-extrabold">Data & Sync</h2>
              <p className="text-[10px] text-[var(--muted)]">Manage training data and sync status.</p>
            </div>
            <Card className="divide-y divide-[var(--border)] p-0">
              <div className="flex items-center justify-between gap-3 p-4">
                <div>
                  <p className="text-sm font-semibold">Sync Status</p>
                  <p className="text-xs text-[var(--muted)]">Current browser session</p>
                </div>
                <Chip tone="success">Synced</Chip>
              </div>
              <div className="flex items-center justify-between gap-3 p-4">
                <div>
                  <p className="text-sm font-semibold">Export Data</p>
                  <p className="text-xs text-[var(--muted)]">Export is a future module.</p>
                </div>
                <Button variant="secondary" disabled>Export</Button>
              </div>
            </Card>
          </section>
        </div>
      </div>
    </Page>
  )
}
