import { useMutation, useQuery } from '@tanstack/react-query'
import { Badge, Button, Card, Modal, TextInput } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import { Calculator, Cloud, Dumbbell, Gauge, LogOut, Monitor, Moon, SlidersHorizontal, Sun, User, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { getApiErrorMessage } from '~/lib/api-error'
import { getMovementName } from '~/lib/movements'
import { e1rm, mround } from '~/lib/progression'
import { authUserQueryOptions, meQueryOptions } from '~/lib/query-options'
import { loadRouteQuery } from '~/lib/route-loading'
import { defaultProgramStateDefaults } from '~/lib/templates'
import { signOutFn } from '~/server/auth'
import { updateSettingsFn } from '~/server/api'
import type { ProgramStateDefaults, ThemePreference, Unit, UserProfile } from '~/types/training'
import { EmptyState, Page, PageHeader, PageLoadError, PageSkeleton } from '~/components/ui'

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
  { id: 'programme-loads', label: 'Programme Loads', icon: Gauge },
  { id: 'equipment', label: 'Equipment', icon: Dumbbell },
  { id: 'data-sync', label: 'Data & Sync', icon: Cloud },
  { id: 'account', label: 'Account', icon: User },
]

type LoadDefaultsTab = 'working_loads' | 'training_maxes'

type LoadHelperState = {
  key: string
  label: string
  type: 'working_load' | 'training_max'
} | null

const programmeLoadSections: Array<{
  id: LoadDefaultsTab
  label: string
  description: string
  keys: string[]
}> = [
  {
    id: 'working_loads',
    label: 'Working Loads',
    description: 'Used by linear/current-load templates.',
    keys: ['squat_working_load', 'bench_press_working_load', 'overhead_press_working_load', 'deadlift_working_load', 'barbell_row_working_load'],
  },
  {
    id: 'training_maxes',
    label: 'Training Maxes',
    description: 'Conservative anchors for percentage and wave templates.',
    keys: ['squat_training_max', 'bench_press_training_max', 'deadlift_training_max', 'overhead_press_training_max'],
  },
]

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
  const [activeLoadTab, setActiveLoadTab] = useState<LoadDefaultsTab>('working_loads')
  const [loadHelper, setLoadHelper] = useState<LoadHelperState>(null)

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

  const activeLoadSection = programmeLoadSections.find((section) => section.id === activeLoadTab) ?? programmeLoadSections[0]!

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
                    onChange={(event) => handleUnitsChange(event.target.value as Unit)}
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
            </Card>
          </section>

          <section id="programme-loads" className="scroll-mt-24">
            <div className="mb-2">
              <h2 className="text-sm font-extrabold">Programme Loads</h2>
              <p className="text-[10px] text-[var(--mantine-color-dimmed)]">
                New programmes copy only the loads their methodology requires. Active programmes keep their own saved values.
              </p>
            </div>
            <Card className="space-y-4 p-4">
              <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar sm:flex-wrap sm:overflow-visible sm:pb-0">
                {programmeLoadSections.map((section) => (
                  <button
                    key={section.id}
                    type="button"
                    className={`min-h-9 whitespace-nowrap rounded-md border px-3 py-1.5 text-xs font-bold transition ${
                      activeLoadTab === section.id
                        ? 'border-[var(--mantine-primary-color-filled)] bg-[var(--mantine-primary-color-filled)] text-white'
                        : 'border-[var(--mantine-color-default-border)] bg-[var(--vf-surface-2)] text-[var(--mantine-color-dimmed)] hover:border-[var(--vf-action-border)] hover:text-[var(--mantine-color-text)]'
                    }`}
                    onClick={() => setActiveLoadTab(section.id)}
                  >
                    {section.label}
                  </button>
                ))}
              </div>

              <div className="rounded-lg border border-[var(--mantine-color-default-border)] bg-[var(--vf-surface-2)] p-3">
                <div className="mb-3">
                  <p className="vf-section-label">{activeLoadSection.label}</p>
                  <p className="mt-1 text-xs text-[var(--mantine-color-dimmed)]">{activeLoadSection.description}</p>
                </div>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {activeLoadSection.keys.map((key) => {
                    const value = programStateDefaults[key] ?? null
                    const label = startingLoadLabel(key)
                    const type = key.endsWith('_training_max') ? 'training_max' : 'working_load'
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
                        <Button
                          variant="default"
                          size="xs"
                          onClick={() => setLoadHelper({ key, label, type })}
                        >
                          <Calculator size={14} />
                          Helper
                        </Button>
                      </div>
                    )
                  })}
                </div>
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

      <LoadHelperModal
        helper={loadHelper}
        units={units}
        rounding={rounding}
        onApply={(key, value) => updateProgramStateDefault(key, value)}
        onClose={() => setLoadHelper(null)}
      />
    </Page>
  )
}

function LoadHelperModal({
  helper,
  units,
  rounding,
  onApply,
  onClose,
}: {
  helper: LoadHelperState
  units: Unit
  rounding: number
  onApply: (key: string, value: number) => void
  onClose: () => void
}) {
  return (
    <Modal opened={Boolean(helper)} onClose={onClose} title={helper?.type === 'training_max' ? 'Estimate training max' : 'Set working load'} size="md">
      {helper ? (
        <LoadHelperForm
          key={helper.key}
          helper={helper}
          units={units}
          rounding={rounding}
          onApply={onApply}
          onClose={onClose}
        />
      ) : null}
    </Modal>
  )
}

function LoadHelperForm({
  helper,
  units,
  rounding,
  onApply,
  onClose,
}: {
  helper: NonNullable<LoadHelperState>
  units: Unit
  rounding: number
  onApply: (key: string, value: number) => void
  onClose: () => void
}) {
  const [knownLoad, setKnownLoad] = useState('')
  const [knownReps, setKnownReps] = useState('5')
  const [knownRir, setKnownRir] = useState('1')
  const [workingLoad, setWorkingLoad] = useState('')
  const knownLoadValue = loadDefaultFromInput(knownLoad)
  const knownRepsValue = integerFromInput(knownReps)
  const knownRirValue = numberFromInput(knownRir)
  const estimatedMax =
    helper.type === 'training_max' && knownLoadValue && knownRepsValue
      ? e1rm(knownLoadValue, knownRepsValue, knownRirValue ?? 0)
      : null
  const trainingMaxSuggestion = estimatedMax ? mround(estimatedMax * 0.9, rounding) : null
  const workingLoadSuggestion = loadDefaultFromInput(workingLoad)
  const suggestion = helper.type === 'training_max' ? trainingMaxSuggestion : workingLoadSuggestion

  const applySuggestion = () => {
    if (!suggestion) return
    onApply(helper.key, suggestion)
    onClose()
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-extrabold">{helper.label}</p>
        <p className="mt-1 text-xs leading-relaxed text-[var(--mantine-color-dimmed)]">
          {helper.type === 'training_max'
            ? 'Use a known set to estimate e1RM, then copy a conservative 90% training max rounded to your profile setting.'
            : 'Use the load you can currently use for the planned work. Linear templates copy this as the starting working load.'}
        </p>
      </div>

      {helper.type === 'training_max' ? (
        <div className="grid gap-3 sm:grid-cols-3">
          <TextInput
            type="number"
            label="Known load"
            value={knownLoad}
            rightSection={<span className="text-xs font-bold text-[var(--mantine-color-dimmed)]">{units}</span>}
            onChange={(event) => setKnownLoad(event.target.value)}
          />
          <TextInput
            type="number"
            label="Reps"
            value={knownReps}
            onChange={(event) => setKnownReps(event.target.value)}
          />
          <TextInput
            type="number"
            label="RIR"
            value={knownRir}
            onChange={(event) => setKnownRir(event.target.value)}
          />
        </div>
      ) : (
        <TextInput
          type="number"
          label="Current working load"
          value={workingLoad}
          rightSection={<span className="text-xs font-bold text-[var(--mantine-color-dimmed)]">{units}</span>}
          onChange={(event) => setWorkingLoad(event.target.value)}
        />
      )}

      <div className="grid gap-2 sm:grid-cols-2">
        {helper.type === 'training_max' ? (
          <div className="rounded-md border border-[var(--mantine-color-default-border)] bg-[var(--vf-surface-2)] p-3">
            <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--mantine-color-dimmed)]">Estimated 1RM</p>
            <p className="mt-1 text-sm font-extrabold">
              {estimatedMax ? `${formatLoadDefault(mround(estimatedMax, rounding))} ${units}` : 'Enter a set'}
            </p>
          </div>
        ) : null}
        <div className="rounded-md border border-[var(--mantine-color-default-border)] bg-[var(--vf-surface-2)] p-3">
          <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--mantine-color-dimmed)]">Suggested value</p>
          <p className="mt-1 text-sm font-extrabold">{suggestion ? `${formatLoadDefault(suggestion)} ${units}` : 'Unset'}</p>
        </div>
      </div>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="default" onClick={onClose}>Cancel</Button>
        <Button disabled={!suggestion} onClick={applySuggestion}>
          <Calculator size={14} />
          Apply
        </Button>
      </div>
    </div>
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

function hasLoadDefault(value: number | null) {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
}

function loadDefaultFromInput(value: string) {
  if (!value.trim()) return null
  const numeric = Number(value)
  return Number.isFinite(numeric) && numeric > 0 ? numeric : null
}

function numberFromInput(value: string) {
  if (!value.trim()) return null
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : null
}

function integerFromInput(value: string) {
  const numeric = numberFromInput(value)
  if (numeric === null || numeric <= 0) return null
  return Math.round(numeric)
}

function formatLoadDefault(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1).replace(/\.0$/, '')
}

function startingLoadLabel(key: string) {
  const type = key.endsWith('_training_max') ? 'training max' : 'working load'
  const movementId = key.replace(/_(training_max|working_load)$/, '')
  return `${getMovementName(movementId)} ${type}`
}

function formatEquipmentLabel(value: string) {
  return value
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}
