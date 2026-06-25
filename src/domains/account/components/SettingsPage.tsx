import { useMutation, useQuery } from '@tanstack/react-query'
import { Badge, Button, Checkbox, Modal, NativeSelect, NumberInput, SegmentedControl, TextInput } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { useRouter } from '@tanstack/react-router'
import { Calculator, Cloud, Dumbbell, Gauge, LogOut, Monitor, Moon, SlidersHorizontal, Sun, User, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { getApiErrorMessage } from '~/shared/lib/api-error'
import { getMovementName } from '~/domains/movement/lib/movements'
import { e1rm, mround } from '~/domains/program/lib/progression'
import { authUserQueryOptions, meQueryOptions } from '~/domains/account/queries'
import { defaultProgramStateDefaults } from '~/domains/program/lib/templates'
import { signOutFn } from '~/domains/account/server/auth-functions'
import { updateSettingsFn } from '~/domains/account/server/profile-functions'
import type { ProgramStateDefaults, ThemePreference, Unit, UserProfile } from '~/shared/types'
import { Caption, EmptyState, Heading, Page, PageHeader, PageLoadError, PageSkeleton, Panel, SectionLabel, Text } from '~/components'

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

export function SettingsPage({ user }: { user: unknown }) {
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
        <Panel
          className="sticky top-16 z-30 mb-4"
          p="sm"
          style={{ borderColor: 'var(--vf-warning-border)', backgroundColor: 'var(--vf-warning-soft)' }}
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <Text size="sm" fw={900}>Unsaved changes</Text>
              <Caption mt={2}>
                Your preferences are previewing locally. Save them to keep this setup.
              </Caption>
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
        </Panel>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[11rem_minmax(0,1fr)]">
        <aside className="hidden lg:block">
          <Panel p="xs" className="flex flex-col">
            <SectionLabel className="px-2 pb-2">Settings</SectionLabel>
            {settingsSections.map((item) => {
              const Icon = item.icon
              return (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  className="flex items-center gap-2 rounded-md px-2.5 py-2 transition focus-visible:outline-none"
                >
                  <Icon size={14} color="var(--mantine-color-dimmed)" />
                  <Text size="xs" fw={700} tone="dimmed">{item.label}</Text>
                </a>
              )
            })}
          </Panel>
        </aside>

        <div className="space-y-5">
          <section id="preferences" className="scroll-mt-24">
            <div className="mb-2">
              <Heading order={2} size="h5">Preferences</Heading>
              <Caption size="0.625rem">Units and rounding are reused when you start a new programme.</Caption>
            </div>
            <Panel className="space-y-3" p="md">
              <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_16rem] md:items-end">
                <div>
                  <SectionLabel>Theme</SectionLabel>
                  <Caption mt={2}>{themeOptions.find((option) => option.value === themePreference)?.description}</Caption>
                </div>
                <SegmentedControl
                  value={themePreference}
                  onChange={(value) => setThemePreference(value as ThemePreference)}
                  data={themeOptions.map((option) => {
                    const Icon = option.icon
                    return {
                      value: option.value,
                      label: (
                        <span className="inline-flex items-center gap-1.5">
                          <Icon size={14} />
                          {option.label}
                        </span>
                      ),
                    }
                  })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <NativeSelect
                  label="Units"
                  value={units}
                  data={[
                    { value: 'kg', label: 'kg' },
                    { value: 'lb', label: 'lb' },
                  ]}
                  onChange={(event) => handleUnitsChange(event.target.value as Unit)}
                />
                <NumberInput
                  label="Rounding"
                  value={rounding}
                  min={0.5}
                  step={0.5}
                  onChange={(value) => setRounding(typeof value === 'number' ? value : Number(value))}
                />
              </div>
            </Panel>
          </section>

          <section id="programme-loads" className="scroll-mt-24">
            <div className="mb-2">
              <Heading order={2} size="h5">Strength Estimates</Heading>
              <Caption size="0.625rem">
                Saved estimated 1RMs are used to suggest starting values when you begin a programme.
              </Caption>
            </div>
            <Panel className="space-y-4" p="md">
              <Panel surface="inset" p="sm">
                <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <SectionLabel>Estimated 1RMs</SectionLabel>
                    <Caption mt={4} maw="42rem" lh={1.45}>
                      Enter a current strength estimate for each main lift. Programme-specific training maxes and
                      working loads are derived later on the start screen.
                    </Caption>
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
                          <SectionLabel size="0.5625rem">{label}</SectionLabel>
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
                          <span className="pointer-events-none absolute right-14 top-1/2 -translate-y-1/2">
                            <Caption fw={800}>
                            {units}
                            </Caption>
                          </span>
                          <button
                            type="button"
                            aria-label={`Clear ${label}`}
                            className="absolute right-2 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md transition"
                            onClick={() => updateProgramStateDefault(key, null)}
                          >
                            <X size={14} color="var(--mantine-color-dimmed)" />
                          </button>
                        </span>
                      </div>
                    )
                  })}
                </div>
                <Caption mt="sm" lh={1.45}>
                  These estimates are global defaults. Active programmes keep their own load values after start, and
                  history can still show e1RM trends from logged sets.
                </Caption>
              </Panel>
            </Panel>
          </section>

          <section id="equipment" className="scroll-mt-24">
            <div className="mb-2">
              <Heading order={2} size="h5">Equipment Profile</Heading>
              <Caption size="0.625rem">Select available equipment to filter alternatives.</Caption>
            </div>
            <Panel p="md">
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {equipmentOptions.map((item) => (
                  <Panel key={item} surface="inset" px="sm" py="xs">
                    <Checkbox
                      checked={equipmentProfile.includes(item)}
                      label={formatEquipmentLabel(item)}
                      onChange={(event) => {
                        setEquipmentProfile((current) =>
                          event.target.checked ? [...current, item] : current.filter((value) => value !== item),
                        )
                      }}
                    />
                  </Panel>
                ))}
              </div>
            </Panel>
          </section>

          <section id="data-sync" className="scroll-mt-24">
            <div className="mb-2">
              <Heading order={2} size="h5">Data & Sync</Heading>
              <Caption size="0.625rem">Manage training data and sync status.</Caption>
            </div>
            <Panel p={0} className="divide-y divide-[var(--mantine-color-default-border)]">
              <div className="flex items-center justify-between gap-3 p-4">
                <div>
                  <Text size="sm" fw={700}>Sync Status</Text>
                  <Caption>Current browser session</Caption>
                </div>
                <Badge color="success">Synced</Badge>
              </div>
              <div className="flex items-center justify-between gap-3 p-4">
                <div>
                  <Text size="sm" fw={700}>Export Data</Text>
                  <Caption>Export is a future module.</Caption>
                </div>
                <Button variant="default" disabled>Export</Button>
              </div>
            </Panel>
          </section>

          <section id="account" className="scroll-mt-24">
            <div className="mb-2">
              <Heading order={2} size="h5">Account</Heading>
              <Caption size="0.625rem">Login identity and session controls.</Caption>
            </div>
            <Panel className="space-y-3" p="md">
              <label className="grid gap-1">
                <SectionLabel>Email Address</SectionLabel>
                <TextInput type="email" value={me?.email ?? ''} readOnly />
              </label>
              <Button className="w-full sm:w-auto" color="danger" variant="light" disabled={signOutMutation.isPending} onClick={() => signOutMutation.mutate()}>
                <LogOut size={14} />
                {signOutMutation.isPending ? 'Signing out...' : 'Sign out'}
              </Button>
            </Panel>
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
          <Text size="sm" fw={900}>Calculate from a known set</Text>
          <Caption mt={4} lh={1.45}>
            Choose the lift, enter a recent hard set, then apply the estimated one-rep max to that lift.
          </Caption>
          <Caption mt="xs" fw={700}>
            These estimates help future programmes suggest starting values. They are not live values for active programmes.
          </Caption>
        </div>

        <Panel surface="inset" className="grid gap-3" p="sm">
          <NativeSelect
            label="Lift"
            value={selectedKey}
            data={keys.map((key) => {
                const movementId = key.replace(/_one_rep_max$/, '')
                return { value: key, label: getMovementName(movementId) }
              })}
            onChange={(event) => onSelectedKeyChange(event.target.value)}
          />

          <TextInput
            type="number"
            label="Load"
            value={knownSetInput.weight}
            rightSection={<Caption fw={800}>{units}</Caption>}
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

          <Panel p="sm">
            <SectionLabel>Estimated 1RM</SectionLabel>
            <Text mt={2} size="lg" fw={900}>
              {hasLoadDefault(calculatedValue) ? `${formatLoadDefault(calculatedValue)} ${units}` : 'Unset'}
            </Text>
          </Panel>
        </Panel>

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
