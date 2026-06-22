import { useMutation, useSuspenseQuery } from '@tanstack/react-query'
import { Badge, Button, Card, TextInput } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import { Cloud, Dumbbell, LogOut, Monitor, Moon, SlidersHorizontal, Sun, User } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { getApiErrorMessage } from '~/lib/api-error'
import { meQueryOptions } from '~/lib/query-options'
import { signOutFn } from '~/server/auth'
import { updateSettingsFn } from '~/server/api'
import type { ThemePreference, Unit } from '~/types/training'
import { EmptyState, Page, PageHeader } from '~/components/ui'

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

const themeOptions: Array<{
  value: ThemePreference
  label: string
  description: string
  icon: typeof Monitor
}> = [
  { value: 'system', label: 'System', description: 'Follow your OS preference.', icon: Monitor },
  { value: 'dark', label: 'Dark', description: 'Keep the gym-friendly dark UI.', icon: Moon },
  { value: 'light', label: 'Light', description: 'Use the brighter desktop-style UI.', icon: Sun },
]

const settingsSections = [
  { id: 'preferences', label: 'Preferences', icon: SlidersHorizontal },
  { id: 'equipment', label: 'Equipment', icon: Dumbbell },
  { id: 'data-sync', label: 'Data & Sync', icon: Cloud },
  { id: 'account', label: 'Account', icon: User },
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
  const [themePreference, setThemePreference] = useState<ThemePreference>(me?.themePreference ?? 'system')

  const hasPendingChanges = useMemo(
    () =>
      Boolean(me) &&
      (units !== me?.units ||
        rounding !== me?.rounding ||
        autoStartTimer !== Boolean(me?.autoStartTimer ?? true) ||
        themePreference !== (me?.themePreference ?? 'system') ||
        !sameStringSet(equipmentProfile, me?.equipmentProfile ?? [])),
    [autoStartTimer, equipmentProfile, me, rounding, themePreference, units],
  )

  useEffect(() => {
    window.dispatchEvent(new CustomEvent('valhalla-theme-preview', { detail: themePreference }))
    return () => {
      window.dispatchEvent(new CustomEvent('valhalla-theme-preview-clear'))
    }
  }, [themePreference])

  const updateMutation = useMutation({
    mutationFn: () =>
      updateSettingsFn({
        data: {
          units,
          rounding,
          autoStartTimer,
          equipmentProfile,
          themePreference,
        },
      }),
    onSuccess: (next) => {
      router.options.context.queryClient.setQueryData(['me'], next)
      if (next) {
        setUnits(next.units)
        setRounding(next.rounding)
        setAutoStartTimer(Boolean(next.autoStartTimer))
        setEquipmentProfile(next.equipmentProfile)
        setThemePreference(next.themePreference)
      }
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

  const discardChanges = () => {
    if (!me) return
    setUnits(me.units)
    setRounding(me.rounding)
    setAutoStartTimer(Boolean(me.autoStartTimer))
    setEquipmentProfile(me.equipmentProfile ?? [])
    setThemePreference(me.themePreference ?? 'system')
  }

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
      <PageHeader title="Settings" eyebrow="Account" actions={<Badge color="success">Synced</Badge>}>
        Units, rounding, equipment profile, and sync preferences.
      </PageHeader>

      {hasPendingChanges ? (
        <div className="sticky top-16 z-30 mb-4 rounded-lg border border-[var(--vf-warning-border)] bg-[var(--vf-warning-soft)] p-3 shadow-[var(--vf-shadow-card)]">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-extrabold text-[var(--mantine-color-text)]">Unsaved changes</p>
              <p className="mt-0.5 text-xs text-[var(--mantine-color-dimmed)]">
                Your preferences are previewing locally. Save them to keep this setup.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:flex sm:shrink-0">
              <Button variant="default" disabled={updateMutation.isPending} onClick={discardChanges}>
                Discard
              </Button>
              <Button disabled={updateMutation.isPending} onClick={() => updateMutation.mutate()}>
                {updateMutation.isPending ? 'Saving...' : 'Save changes'}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[11rem_minmax(0,1fr)]">
        <aside className="hidden rounded-[var(--mantine-radius-lg)] border border-[var(--mantine-color-default-border)] bg-[var(--mantine-color-default)] p-3 shadow-[var(--vf-shadow-card)] lg:flex lg:flex-col">
          <p className="vf-section-label px-2 pb-2">Settings</p>
          {settingsSections.map((item) => {
            const Icon = item.icon
            return (
              <a
                key={item.id}
                href={`#${item.id}`}
                className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-semibold text-[var(--mantine-color-dimmed)] transition hover:bg-[var(--vf-surface-2)] hover:text-[var(--mantine-color-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mantine-primary-color-filled)]"
              >
                <Icon size={14} />
                {item.label}
              </a>
            )
          })}
        </aside>

        <div className="space-y-5">
          <section id="preferences" className="scroll-mt-24">
            <div className="mb-2">
              <h2 className="text-sm font-extrabold">Preferences</h2>
              <p className="text-[10px] text-[var(--mantine-color-dimmed)]">Units, rounding, and session defaults.</p>
            </div>
            <Card className="space-y-3 p-4">
              <div>
                <span className="vf-section-label">Theme</span>
                <div className="mt-2 grid gap-2 sm:grid-cols-3">
                  {themeOptions.map((option) => {
                    const Icon = option.icon
                    const active = themePreference === option.value
                    return (
                      <button
                        key={option.value}
                        type="button"
                        className={`rounded-xl border p-3 text-left transition ${
                          active
                            ? 'border-[var(--vf-action-border)] bg-[var(--vf-action-soft)] text-[var(--mantine-color-text)]'
                            : 'border-[var(--mantine-color-default-border)] bg-[var(--vf-surface-2)] text-[var(--mantine-color-dimmed)] hover:border-[var(--vf-action-border)] hover:text-[var(--mantine-color-text)]'
                        }`}
                        onClick={() => setThemePreference(option.value)}
                      >
                        <span className="flex items-center gap-2 text-sm font-extrabold">
                          <Icon size={15} className={active ? 'text-[var(--vf-action-text)]' : undefined} />
                          {option.label}
                        </span>
                        <span className="mt-1 block text-xs leading-relaxed text-[var(--mantine-color-dimmed)]">{option.description}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="grid gap-1">
                  <span className="vf-section-label">Units</span>
                  <select
                    className="min-h-10 rounded-[var(--mantine-radius-md)] border border-[var(--mantine-color-default-border)] bg-[var(--vf-surface-2)] px-3 font-medium"
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
              <label className="flex items-center justify-between rounded-lg border border-[var(--mantine-color-default-border)] bg-[var(--vf-surface-2)] p-3">
                <span>
                  <span className="block text-sm font-semibold">Auto-start rest timer</span>
                  <span className="text-xs text-[var(--mantine-color-dimmed)]">Starts after each completed set.</span>
                </span>
                <input className="h-5 w-5 accent-[var(--mantine-primary-color-filled)]" type="checkbox" checked={autoStartTimer} onChange={(event) => setAutoStartTimer(event.target.checked)} />
              </label>
            </Card>
          </section>

          <section id="equipment" className="scroll-mt-24">
            <div className="mb-2">
              <h2 className="text-sm font-extrabold">Equipment Profile</h2>
              <p className="text-[10px] text-[var(--mantine-color-dimmed)]">Select available equipment to filter alternatives.</p>
            </div>
            <Card className="p-4">
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {equipmentOptions.map((item) => (
                  <label key={item} className="flex items-center justify-between rounded-lg border border-[var(--mantine-color-default-border)] bg-[var(--vf-surface-2)] p-3">
                    <span className="text-sm font-semibold">{item.replaceAll('_', ' ')}</span>
                    <input
                      className="h-4 w-4 accent-[var(--mantine-primary-color-filled)]"
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
            </Card>
          </section>

          <section id="data-sync" className="scroll-mt-24">
            <div className="mb-2">
              <h2 className="text-sm font-extrabold">Data & Sync</h2>
              <p className="text-[10px] text-[var(--mantine-color-dimmed)]">Manage training data and sync status.</p>
            </div>
            <Card className="divide-y divide-[var(--mantine-color-default-border)] p-0">
              <div className="flex items-center justify-between gap-3 p-4">
                <div>
                  <p className="text-sm font-semibold">Sync Status</p>
                  <p className="text-xs text-[var(--mantine-color-dimmed)]">Current browser session</p>
                </div>
                <Badge color="success">Synced</Badge>
              </div>
              <div className="flex items-center justify-between gap-3 p-4">
                <div>
                  <p className="text-sm font-semibold">Export Data</p>
                  <p className="text-xs text-[var(--mantine-color-dimmed)]">Export is a future module.</p>
                </div>
                <Button variant="default" disabled>Export</Button>
              </div>
            </Card>
          </section>

          <section id="account" className="scroll-mt-24">
            <div className="mb-2">
              <h2 className="text-sm font-extrabold">Account</h2>
              <p className="text-[10px] text-[var(--mantine-color-dimmed)]">Login identity and session controls.</p>
            </div>
            <Card className="space-y-3 p-4">
              <label className="grid gap-1">
                <span className="vf-section-label">Email Address</span>
                <TextInput type="email" value={me?.email ?? ''} readOnly />
              </label>
              <Button className="w-full sm:w-auto" color="danger" variant="light" disabled={signOutMutation.isPending} onClick={() => signOutMutation.mutate()}>
                <LogOut size={14} />
                {signOutMutation.isPending ? 'Signing out...' : 'Sign out'}
              </Button>
            </Card>
          </section>
        </div>
      </div>
    </Page>
  )
}

function sameStringSet(left: string[], right: string[]) {
  if (left.length !== right.length) return false
  const normalizedLeft = [...left].sort()
  const normalizedRight = [...right].sort()
  return normalizedLeft.every((value, index) => value === normalizedRight[index])
}
