import { useMutation, useQuery } from '@tanstack/react-query'
import { Badge, Button, Card, Modal, TextInput } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import { Calculator, Cloud, Dumbbell, Gauge, LogOut, Monitor, Moon, SlidersHorizontal, Sun, User, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { getApiErrorMessage } from '~/shared/lib/api-error'
import { getMovementName } from '~/domains/movement/lib/movements'
import { e1rm, mround } from '~/domains/program/lib/progression'
import { authUserQueryOptions, meQueryOptions } from '~/lib/query-options'
import { loadRouteQuery } from '~/shared/lib/route-loading'
import { defaultProgramStateDefaults } from '~/domains/program/lib/templates'
import { signOutFn } from '~/domains/account/server/auth'
import { updateSettingsFn } from '~/server/api'
import type { ProgramStateDefaults, ThemePreference, Unit, UserProfile } from '~/shared/types'
import { EmptyState, Page, PageHeader, PageLoadError, PageSkeleton } from '~/components'

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
  { id: 'programme-loads', label: 'Strength Estimates', icon: Gauge },
  { id: 'equipment', label: 'Equipment', icon: Dumbbell },
  { id: 'data-sync', label: 'Data & Sync', icon: Cloud },
  { id: 'account', label: 'Account', icon: User },
]

type KnownSetInput = {
  weight: string
  reps: string
  rir: string
}

const oneRepMaxKeys = ['squat_one_rep_max', 'bench_press_one_rep_max', 'deadlift_one_rep_max', 'overhead_press_one_rep_max', 'barbell_row_one_rep_max']

export const Route = createFileRoute('/settings')({
  loader: async ({ context }) => {
    if ((context as any).user) await loadRouteQuery(context.queryClient, meQueryOptions())
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
  const meQuery = useQuery(meQueryOptions())

  if (meQuery.isPending) return <PageSkeleton compact />
  if (meQuery.isError) return <PageLoadError error={meQuery.error} onRetry={() => void meQuery.refetch()} />
  if (!meQuery.data) {
    return (
      <Page>
        <EmptyState title="Profile unavailable">Sign in again to edit settings.</EmptyState>
      </Page>
    )
  }

  return <SettingsForm me={meQuery.data} />
}

function SettingsForm({ me }: { me: UserProfile }) {
  const router = useRouter()
  const [units, setUnits] = useState<Unit>(me?.units ?? 'kg')
  const [rounding, setRounding] = useState(me?.rounding ?? 2.5)
  const [equipmentProfile, setEquipmentProfile] = useState<string[]>(me?.equipmentProfile ?? [])
  const [themePreference, setThemePreference] = useState<ThemePreference>(me?.themePreference ?? 'system')
  const [programStateDefaults, setProgramStateDefaults] = useState<ProgramStateDefaults>(
    me?.programStateDefaults ?? defaultProgramStateDefaults(me?.units ?? 'kg'),
  )
  const [showOneRepMaxCalculator, setShowOneRepMaxCalculator] = useState(false)
  const [selectedOneRepMaxKey, setSelectedOneRepMaxKey] = useState(oneRepMaxKeys[0]!)
  const [knownSetInput, setKnownSetInput] = useState<KnownSetInput>({ weight: '', reps: '', rir: '0' })

  const hasPendingChanges = useMemo(
    () =>
      Boolean(me) &&
      (units !== me?.units ||
        rounding !== me?.rounding ||
        themePreference !== (me?.themePreference ?? 'system') ||
        !sameNumberRecord(programStateDefaults, me?.programStateDefaults ?? defaultProgramStateDefaults(me?.units ?? units)) ||
        !sameStringSet(equipmentProfile, me?.equipmentProfile ?? [])),
    [equipmentProfile, me, programStateDefaults, rounding, themePreference, units],
  )

  useEffect(() => {
    window.dispatchEvent(new CustomEvent('sheetless-theme-preview', { detail: themePreference }))
    return () => {
      window.dispatchEvent(new CustomEvent('sheetless-theme-preview-clear'))
    }
  }, [themePreference])

  const updateMutation = useMutation({
    mutationFn: () =>
      updateSettingsFn({
        data: {
          units,
          rounding,
          equipmentProfile,
          themePreference,
          programStateDefaults,
        },
      }),
    onSuccess: (next) => {
      router.options.context.queryClient.setQueryData(['me'], next)
      if (next) {
        setUnits(next.units)
        setRounding(next.rounding)
        setEquipmentProfile(next.equipmentProfile)
        setThemePreference(next.themePreference)
        setProgramStateDefaults(next.programStateDefaults)
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
    setEquipmentProfile(me.equipmentProfile ?? [])
    setThemePreference(me.themePreference ?? 'system')
    setProgramStateDefaults(me.programStateDefaults ?? defaultProgramStateDefaults(me.units))
  }

  const handleUnitsChange = (nextUnits: Unit) => {
    const currentWasUnitDefault = sameNumberRecord(programStateDefaults, defaultProgramStateDefaults(units))
    setUnits(nextUnits)
    if (currentWasUnitDefault) setProgramStateDefaults(defaultProgramStateDefaults(nextUnits))
  }

  const updateProgramStateDefault = (key: string, value: number | null) => {
    setProgramStateDefaults((current) => ({
      ...current,
      [key]: value,
    }))
  }

  const calculatedOneRepMax = useMemo(
    () => calculateOneRepMaxFromKnownSet(knownSetInput, rounding),
    [knownSetInput, rounding],
  )
  const hasCalculatedOneRepMax = hasLoadDefault(calculatedOneRepMax)

  const applyCalculatedOneRepMax = () => {
    if (!hasLoadDefault(calculatedOneRepMax)) return
    setProgramStateDefaults((current) => {
      return {
        ...current,
        [selectedOneRepMaxKey]: calculatedOneRepMax,
      }
    })
    setShowOneRepMaxCalculator(false)
  }

  const signOutMutation = useMutation({
    mutationFn: async () => {
      const result = await signOutFn()
      if (!result.ok) throw new Error(result.message)
      return result
    },
    onSuccess: async () => {
      const queryClient = router.options.context.queryClient
      queryClient.setQueryData(authUserQueryOptions().queryKey, null)
      queryClient.setQueryData(meQueryOptions().queryKey, null)
      queryClient.removeQueries({ queryKey: ['activeProgram'] })
      queryClient.removeQueries({ queryKey: ['today'] })
      queryClient.removeQueries({ queryKey: ['programOverview'] })
      queryClient.removeQueries({ queryKey: ['history'] })
      queryClient.removeQueries({ queryKey: ['session'] })
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
        Programme defaults, equipment profile, and sync preferences.
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
              <p className="text-[10px] text-[var(--mantine-color-dimmed)]">Units and rounding are reused when you start a new programme.</p>
            </div>
            <Card className="space-y-3 p-4">
              <div>
                <span className="vf-section-label">Theme</span>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {themeOptions.map((option) => {
                    const Icon = option.icon
                    const active = themePreference === option.value
                    return (
                      <button
                        key={option.value}
                        type="button"
                        className={`rounded-lg border px-2 py-2 text-center transition sm:p-3 sm:text-left ${
                          active
                            ? 'border-[var(--vf-action-border)] bg-[var(--vf-action-soft)] text-[var(--mantine-color-text)]'
                            : 'border-[var(--mantine-color-default-border)] bg-[var(--vf-surface-2)] text-[var(--mantine-color-dimmed)] hover:border-[var(--vf-action-border)] hover:text-[var(--mantine-color-text)]'
                        }`}
                        onClick={() => setThemePreference(option.value)}
                      >
                        <span className="flex flex-col items-center gap-1 text-xs font-extrabold sm:flex-row sm:gap-2 sm:text-sm">
                          <Icon size={15} className={active ? 'text-[var(--vf-action-text)]' : undefined} />
                          {option.label}
                        </span>
                        <span className="mt-1 hidden text-xs leading-relaxed text-[var(--mantine-color-dimmed)] sm:block">{option.description}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <label className="grid gap-1">
                  <span className="vf-section-label">Units</span>
                  <select
                    className="min-h-9 rounded-[var(--mantine-radius-md)] border border-[var(--mantine-color-default-border)] bg-[var(--vf-surface-2)] px-3 text-sm font-medium sm:min-h-10"
                    value={units}
                    onChange={(event) => handleUnitsChange(event.target.value as Unit)}
                  >
                    <option value="kg">kg</option>
                    <option value="lb">lb</option>
                  </select>
                </label>
                <label className="grid gap-1">
                  <span className="vf-section-label">Rounding</span>
                  <TextInput
                    classNames={{ input: '!min-h-9 !text-sm sm:!min-h-10' }}
                    type="number"
                    value={rounding}
                    onChange={(event) => setRounding(Number(event.target.value))}
                  />
                </label>
              </div>
            </Card>
          </section>

          <section id="programme-loads" className="scroll-mt-24">
            <div className="mb-2">
              <h2 className="text-sm font-extrabold">Strength Estimates</h2>
              <p className="text-[10px] text-[var(--mantine-color-dimmed)]">
                Saved estimated 1RMs are used to suggest starting values when you begin a programme.
              </p>
            </div>
            <Card className="space-y-4 p-4">
              <div className="rounded-lg border border-[var(--mantine-color-default-border)] bg-[var(--vf-surface-2)] p-3">
                <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="vf-section-label">Estimated 1RMs</p>
                    <p className="mt-1 max-w-2xl text-xs leading-relaxed text-[var(--mantine-color-dimmed)]">
                      Enter a current strength estimate for each main lift. Programme-specific training maxes and
                      working loads are derived later on the start screen.
                    </p>
                  </div>
                  <Button variant="default" size="xs" onClick={() => setShowOneRepMaxCalculator(true)}>
                    <Calculator size={14} />
                    Calculate from known sets
                  </Button>
                </div>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {oneRepMaxKeys.map((key) => {
                    const value = programStateDefaults[key] ?? null
                    const label = strengthEstimateLabel(key)
                    return (
                      <div key={key} className="grid gap-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] font-bold uppercase tracking-wide text-[var(--mantine-color-dimmed)]">
                            {label}
                          </span>
                          <Badge color={hasLoadDefault(value) ? 'success' : 'warning'} size="xs">
                            {hasLoadDefault(value) ? 'Set' : 'Unset'}
                          </Badge>
                        </div>
                        <span className="relative block">
                          <TextInput
                            classNames={{ input: 'pr-24 text-right' }}
                            type="number"
                            placeholder="Unset"
                            value={value ?? ''}
                            onChange={(event) => updateProgramStateDefault(key, loadDefaultFromInput(event.target.value))}
                          />
                          <span className="pointer-events-none absolute right-14 top-1/2 -translate-y-1/2 text-xs font-bold text-[var(--mantine-color-dimmed)]">
                            {units}
                          </span>
                          <button
                            type="button"
                            aria-label={`Clear ${label}`}
                            className="absolute right-2 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-[var(--mantine-color-dimmed)] transition hover:bg-[var(--vf-surface-2)] hover:text-[var(--mantine-color-text)]"
                            onClick={() => updateProgramStateDefault(key, null)}
                          >
                            <X size={14} />
                          </button>
                        </span>
                      </div>
                    )
                  })}
                </div>
                <p className="mt-3 text-[11px] leading-relaxed text-[var(--mantine-color-dimmed)]">
                  These estimates are global defaults. Active programmes keep their own load values after start, and
                  history can still show e1RM trends from logged sets.
                </p>
              </div>
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
                    <span className="text-sm font-semibold">{formatEquipmentLabel(item)}</span>
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

      <OneRepMaxCalculatorModal
        opened={showOneRepMaxCalculator}
        keys={oneRepMaxKeys}
        selectedKey={selectedOneRepMaxKey}
        units={units}
        knownSetInput={knownSetInput}
        calculatedValue={calculatedOneRepMax}
        canApply={hasCalculatedOneRepMax}
        onSelectedKeyChange={setSelectedOneRepMaxKey}
        onKnownSetChange={(field, value) =>
          setKnownSetInput((current) => ({
            ...current,
            [field]: value,
          }))
        }
        onApply={applyCalculatedOneRepMax}
        onClose={() => setShowOneRepMaxCalculator(false)}
      />
    </Page>
  )
}

function OneRepMaxCalculatorModal({
  opened,
  keys,
  selectedKey,
  units,
  knownSetInput,
  calculatedValue,
  canApply,
  onSelectedKeyChange,
  onKnownSetChange,
  onApply,
  onClose,
}: {
  opened: boolean
  keys: string[]
  selectedKey: string
  units: Unit
  knownSetInput: KnownSetInput
  calculatedValue: number | null
  canApply: boolean
  onSelectedKeyChange: (key: string) => void
  onKnownSetChange: (field: keyof KnownSetInput, value: string) => void
  onApply: () => void
  onClose: () => void
}) {
  const selectedMovementId = selectedKey.replace(/_one_rep_max$/, '')
  const selectedMovementName = getMovementName(selectedMovementId)

  return (
    <Modal opened={opened} onClose={onClose} title="Calculate estimated 1RM" size="lg">
      <div className="space-y-4">
        <div>
          <p className="text-sm font-extrabold">Calculate from a known set</p>
          <p className="mt-1 text-xs leading-relaxed text-[var(--mantine-color-dimmed)]">
            Choose the lift, enter a recent hard set, then apply the estimated one-rep max to that lift.
          </p>
          <p className="mt-2 text-[11px] font-semibold text-[var(--mantine-color-dimmed)]">
            These estimates help future programmes suggest starting values. They are not live values for active programmes.
          </p>
        </div>

        <div className="grid gap-3 rounded-md border border-[var(--mantine-color-default-border)] bg-[var(--vf-surface-2)] p-3">
          <label className="grid gap-1">
            <span className="text-[10px] font-bold uppercase tracking-wide text-[var(--mantine-color-dimmed)]">Lift</span>
            <select
              className="min-h-9 rounded-md border border-[var(--mantine-color-default-border)] bg-[var(--mantine-color-default)] px-2.5 text-sm font-semibold"
              value={selectedKey}
              onChange={(event) => onSelectedKeyChange(event.target.value)}
            >
              {keys.map((key) => {
                const movementId = key.replace(/_one_rep_max$/, '')
                return (
                  <option key={key} value={key}>
                    {getMovementName(movementId)}
                  </option>
                )
              })}
            </select>
          </label>

          <TextInput
            type="number"
            label="Load"
            value={knownSetInput.weight}
            rightSection={<span className="text-xs font-bold text-[var(--mantine-color-dimmed)]">{units}</span>}
            onChange={(event) => onKnownSetChange('weight', event.target.value)}
          />
          <div className="grid grid-cols-2 gap-2">
            <TextInput
              type="number"
              label="Reps"
              value={knownSetInput.reps}
              onChange={(event) => onKnownSetChange('reps', event.target.value)}
            />
            <TextInput
              type="number"
              label="RIR"
              value={knownSetInput.rir}
              onChange={(event) => onKnownSetChange('rir', event.target.value)}
            />
          </div>

          <div className="rounded-md border border-[var(--mantine-color-default-border)] bg-[var(--mantine-color-default)] p-3">
            <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--mantine-color-dimmed)]">Estimated 1RM</p>
            <p className="mt-0.5 text-lg font-extrabold">
              {hasLoadDefault(calculatedValue) ? `${formatLoadDefault(calculatedValue)} ${units}` : 'Unset'}
            </p>
          </div>
        </div>

        <div className="flex justify-end">
          <Button disabled={!canApply} onClick={onApply}>
            <Calculator size={14} />
            Apply to {selectedMovementName}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

function sameStringSet(left: string[], right: string[]) {
  if (left.length !== right.length) return false
  const normalizedLeft = [...left].sort()
  const normalizedRight = [...right].sort()
  return normalizedLeft.every((value, index) => value === normalizedRight[index])
}

function sameNumberRecord(left: ProgramStateDefaults, right: ProgramStateDefaults) {
  const keys = new Set([...Object.keys(left), ...Object.keys(right)])
  for (const key of keys) {
    if ((left[key] ?? null) !== (right[key] ?? null)) return false
  }
  return true
}

function hasLoadDefault(value: number | null | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
}

function loadDefaultFromInput(value: string) {
  if (!value.trim()) return null
  const numeric = Number(value)
  return Number.isFinite(numeric) && numeric > 0 ? numeric : null
}

function calculateEstimatedOneRepMax(input: KnownSetInput | undefined) {
  if (!input) return null
  const weight = loadDefaultFromInput(input.weight)
  const reps = loadDefaultFromInput(input.reps)
  if (!weight || !reps) return null
  const rir = loadDefaultFromInput(input.rir) ?? 0
  const estimated = e1rm(weight, reps, rir)
  return hasLoadDefault(estimated) ? estimated : null
}

function calculateOneRepMaxFromKnownSet(input: KnownSetInput | undefined, rounding: number) {
  const estimated = calculateEstimatedOneRepMax(input)
  if (!estimated) return null
  return mround(estimated, rounding)
}

function formatLoadDefault(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1).replace(/\.0$/, '')
}

function strengthEstimateLabel(key: string) {
  const movementId = key.replace(/_one_rep_max$/, '')
  return `${getMovementName(movementId)} estimated 1RM`
}

function formatEquipmentLabel(value: string) {
  return value
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}
