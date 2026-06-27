import { useMutation, useQuery } from '@tanstack/react-query'
import { Badge, Button, Checkbox, Modal, NativeSelect, SegmentedControl, TextInput } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { useRouter } from '@tanstack/react-router'
import { ArrowRight, Calculator, Check, Cloud, Dumbbell, Gauge, LogOut, Monitor, Moon, SlidersHorizontal, Sun, User, X } from 'lucide-react'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { getApiErrorMessage } from '~/shared/lib/api-error'
import { getMovementName } from '~/domains/movement/lib/movements'
import { e1rm, mround } from '~/domains/program/lib/progression'
import { authUserQueryOptions, meQueryOptions } from '~/domains/account/queries'
import { defaultProgramStateDefaults } from '~/domains/program/lib/templates'
import { signOutFn } from '~/domains/account/server/auth-functions'
import { updateSettingsFn } from '~/domains/account/server/profile-functions'
import { useOnboardingTour } from '~/domains/onboarding/useOnboardingTour'
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
const roundingOptions = [
  { value: '1.25', label: '1.25' },
  { value: '2.5', label: '2.5' },
  { value: '5', label: '5' },
]

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
  const { start: startTour } = useOnboardingTour()
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

  const liftOptions = useMemo(() => buildLiftOptions(programStateDefaults, units), [programStateDefaults, units])
  const setOneRepMaxCount = useMemo(
    () => oneRepMaxKeys.filter((key) => hasLoadDefault(programStateDefaults[key] ?? null)).length,
    [programStateDefaults],
  )
  const nextUnsetOneRepMaxKey = useMemo(
    () => nextUnsetKey(programStateDefaults, selectedOneRepMaxKey),
    [programStateDefaults, selectedOneRepMaxKey],
  )

  const resetKnownSetInput = () => setKnownSetInput({ weight: '', reps: '', rir: '0' })

  const openOneRepMaxCalculator = () => {
    setSelectedOneRepMaxKey(firstUnsetKey(programStateDefaults) ?? oneRepMaxKeys[0]!)
    resetKnownSetInput()
    setShowOneRepMaxCalculator(true)
  }

  const handleSelectedKeyChange = (key: string) => {
    setSelectedOneRepMaxKey(key)
    resetKnownSetInput()
  }

  const applyCalculatedOneRepMax = () => {
    if (!hasLoadDefault(calculatedOneRepMax)) return
    setProgramStateDefaults((current) => ({
      ...current,
      [selectedOneRepMaxKey]: calculatedOneRepMax,
    }))
    setShowOneRepMaxCalculator(false)
  }

  const applyCalculatedOneRepMaxAndNext = () => {
    if (!hasLoadDefault(calculatedOneRepMax)) return
    const updated = { ...programStateDefaults, [selectedOneRepMaxKey]: calculatedOneRepMax }
    setProgramStateDefaults(updated)
    const target = nextUnsetKey(updated, selectedOneRepMaxKey)
    if (target) {
      setSelectedOneRepMaxKey(target)
      resetKnownSetInput()
    } else {
      setShowOneRepMaxCalculator(false)
    }
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

      <div className="grid gap-3 lg:grid-cols-[10rem_minmax(0,1fr)]">
        <aside className="hidden lg:block">
          <Panel p="xs" className="sticky top-16 flex flex-col">
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

        <div className="space-y-4">
          <SettingsSection
            id="preferences"
            title="Preferences"
            description="Units and rounding are reused when you start a new programme."
          >
            <Panel className="grid gap-3" p="sm">
              <div className="grid gap-3 lg:hidden">
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
                <div className="grid grid-cols-2 gap-2">
                  <NativeSelect
                    label="Units"
                    value={units}
                    data={[
                      { value: 'kg', label: 'kg' },
                      { value: 'lb', label: 'lb' },
                    ]}
                    onChange={(event) => handleUnitsChange(event.target.value as Unit)}
                  />
                  <NativeSelect
                    label="Rounding"
                    value={String(rounding)}
                    data={roundingOptions}
                    onChange={(event) => setRounding(Number(event.target.value))}
                  />
                </div>
              </div>

              <div className="hidden gap-4 lg:grid lg:grid-cols-2 lg:items-start">
                <div className="grid gap-2">
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
                <div className="grid gap-2">
                  <div>
                    <SectionLabel>Load defaults</SectionLabel>
                    <Caption mt={2}>Units and rounding for new programmes.</Caption>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <NativeSelect
                      leftSection={<Caption fw={800}>Units</Caption>}
                      leftSectionWidth={58}
                      value={units}
                      data={[
                        { value: 'kg', label: 'kg' },
                        { value: 'lb', label: 'lb' },
                      ]}
                      onChange={(event) => handleUnitsChange(event.target.value as Unit)}
                    />
                    <NativeSelect
                      leftSection={<Caption fw={800}>Round</Caption>}
                      leftSectionWidth={64}
                      value={String(rounding)}
                      data={roundingOptions}
                      onChange={(event) => setRounding(Number(event.target.value))}
                    />
                  </div>
                </div>
              </div>
            </Panel>
          </SettingsSection>

          <SettingsSection
            id="programme-loads"
            title="Strength Estimates"
            description="Saved estimated 1RMs are used to suggest starting values when you begin a programme."
          >
            <Panel p="sm">
              <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <SectionLabel>Estimated 1RMs</SectionLabel>
                  <Caption mt={3} maw="42rem" lh={1.4}>
                    Enter a current strength estimate for each main lift. Programme-specific training maxes and
                    working loads are derived later on the start screen.
                  </Caption>
                </div>
                <Button
                  className="sm:shrink-0"
                  size="sm"
                  onClick={openOneRepMaxCalculator}
                >
                  <Calculator size={14} />
                  Calculate from known sets
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
                {oneRepMaxKeys.map((key) => {
                  const value = programStateDefaults[key] ?? null
                  const label = strengthEstimateLabel(key)
                  const isSet = hasLoadDefault(value)
                  return (
                    <div key={key} className="grid min-w-0 gap-1">
                      <div className="flex min-w-0 items-center justify-between gap-1">
                        <SectionLabel className="min-w-0" size="0.5rem" lh={1.1} truncate>
                          {label}
                        </SectionLabel>
                        <Badge className="shrink-0" color={isSet ? 'success' : 'warning'}>
                          {isSet ? 'Set' : 'Unset'}
                        </Badge>
                      </div>
                      <span className="relative block pt-0.5">
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
              <Caption mt="sm" lh={1.4}>
                These estimates are global defaults. Active programmes keep their own load values after start, and
                history can still show e1RM trends from logged sets.
              </Caption>
            </Panel>
          </SettingsSection>

          <SettingsSection
            id="equipment"
            title="Equipment Profile"
            description="Select available equipment to filter alternatives."
          >
            <Panel p="sm">
              <div className="grid grid-cols-2 gap-1.5 sm:gap-2 md:grid-cols-3">
                {equipmentOptions.map((item) => (
                  <Panel key={item} surface="inset" className="min-w-0" px="xs" py={6}>
                    <Checkbox
                      size="sm"
                      checked={equipmentProfile.includes(item)}
                      label={
                        <Text component="span" size="sm" fw={700} truncate>
                          {formatEquipmentLabel(item)}
                        </Text>
                      }
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
          </SettingsSection>

          <SettingsSection
            id="data-sync"
            title="Data & Sync"
            description="Manage training data and sync status."
          >
            <Panel p={0} className="divide-y divide-[var(--mantine-color-default-border)]">
              <div className="flex items-center justify-between gap-3 p-3">
                <div>
                  <Text size="sm" fw={700}>Sync Status</Text>
                  <Caption>Current browser session</Caption>
                </div>
                <Badge color="success">Synced</Badge>
              </div>
              <div className="flex items-center justify-between gap-3 p-3">
                <div>
                  <Text size="sm" fw={700}>Export Data</Text>
                  <Caption>Export is a future module.</Caption>
                </div>
                <Button variant="default" size="xs" disabled>Export</Button>
              </div>
              <div className="flex items-center justify-between gap-3 p-3">
                <div>
                  <Text size="sm" fw={700}>Getting-started tour</Text>
                  <Caption>Replay the welcome walkthrough.</Caption>
                </div>
                <Button variant="default" size="xs" onClick={() => startTour()}>Replay tour</Button>
              </div>
            </Panel>
          </SettingsSection>

          <SettingsSection
            id="account"
            title="Account"
            description="Login identity and session controls."
          >
            <Panel p="sm">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <label className="grid min-w-0 gap-1 sm:flex-1">
                  <SectionLabel>Email Address</SectionLabel>
                  <TextInput type="email" value={me?.email ?? ''} readOnly />
                </label>
                <Button className="w-full sm:w-auto sm:shrink-0" color="danger" variant="light" disabled={signOutMutation.isPending} onClick={() => signOutMutation.mutate()}>
                  <LogOut size={14} />
                  {signOutMutation.isPending ? 'Signing out...' : 'Sign out'}
                </Button>
              </div>
            </Panel>
          </SettingsSection>
        </div>
      </div>

      <OneRepMaxCalculatorModal
        opened={showOneRepMaxCalculator}
        selectedKey={selectedOneRepMaxKey}
        liftOptions={liftOptions}
        units={units}
        knownSetInput={knownSetInput}
        calculatedValue={calculatedOneRepMax}
        canApply={hasCalculatedOneRepMax}
        isLastUnset={nextUnsetOneRepMaxKey === null}
        setCount={setOneRepMaxCount}
        totalCount={oneRepMaxKeys.length}
        onSelectedKeyChange={handleSelectedKeyChange}
        onKnownSetChange={(field, value) =>
          setKnownSetInput((current) => ({
            ...current,
            [field]: value,
          }))
        }
        onApplyAndClose={applyCalculatedOneRepMax}
        onApplyAndNext={applyCalculatedOneRepMaxAndNext}
        onClose={() => setShowOneRepMaxCalculator(false)}
      />
    </Page>
  )
}

function SettingsSection({
  id,
  title,
  description,
  children,
}: {
  id: string
  title: string
  description: string
  children: ReactNode
}) {
  return (
    <section id={id} className="scroll-mt-24">
      <div className="mb-1.5">
        <Heading order={2} size="h5">{title}</Heading>
        <Caption size="0.625rem">{description}</Caption>
      </div>
      {children}
    </section>
  )
}

function OneRepMaxCalculatorModal({
  opened,
  selectedKey,
  liftOptions,
  units,
  knownSetInput,
  calculatedValue,
  canApply,
  isLastUnset,
  setCount,
  totalCount,
  onSelectedKeyChange,
  onKnownSetChange,
  onApplyAndClose,
  onApplyAndNext,
  onClose,
}: {
  opened: boolean
  selectedKey: string
  liftOptions: Array<{ group: string; items: Array<{ value: string; label: string }> }>
  units: Unit
  knownSetInput: KnownSetInput
  calculatedValue: number | null
  canApply: boolean
  isLastUnset: boolean
  setCount: number
  totalCount: number
  onSelectedKeyChange: (key: string) => void
  onKnownSetChange: (field: keyof KnownSetInput, value: string) => void
  onApplyAndClose: () => void
  onApplyAndNext: () => void
  onClose: () => void
}) {
  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Calculate estimated 1RM"
      size="md"
      classNames={{
        inner: '!items-end sm:!items-center',
        content: '!mb-0 !rounded-b-none sm:!rounded-lg',
        body: '!max-h-[calc(92dvh-3.25rem)] !overflow-y-auto',
      }}
    >
      <div className="space-y-4">
        <div>
          <Text size="sm" fw={900}>Calculate from a known set</Text>
          <Caption mt={4} lh={1.45}>
            Choose the lift, enter a recent hard set, then apply the estimated one-rep max to that lift. These estimates
            suggest future programme starting values, not live values for active programmes.
          </Caption>
          <Text mt="xs" size="xs" fw={800} tone="action">
            {setCount} of {totalCount} lifts set
          </Text>
        </div>

        <Panel surface="inset" className="grid gap-3" p="sm">
          <NativeSelect
            label="Lift"
            value={selectedKey}
            data={liftOptions}
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

        <div className="grid grid-cols-2 gap-2">
          <Button variant="default" disabled={!canApply} onClick={onApplyAndClose}>
            Set &amp; close
          </Button>
          <Button disabled={!canApply} onClick={onApplyAndNext}>
            {isLastUnset ? (
              <>
                <Check size={14} />
                Done
              </>
            ) : (
              <>
                Set &amp; next
                <ArrowRight size={14} />
              </>
            )}
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

function buildLiftOptions(defaults: ProgramStateDefaults, units: Unit) {
  const groups: Array<{ group: string; items: Array<{ value: string; label: string }> }> = []
  const unset = oneRepMaxKeys.filter((key) => !hasLoadDefault(defaults[key] ?? null))
  const set = oneRepMaxKeys.filter((key) => hasLoadDefault(defaults[key] ?? null))
  if (unset.length) {
    groups.push({
      group: 'Not set yet',
      items: unset.map((key) => ({ value: key, label: getMovementName(key.replace(/_one_rep_max$/, '')) })),
    })
  }
  if (set.length) {
    groups.push({
      group: 'Already set',
      items: set.map((key) => ({
        value: key,
        label: `${getMovementName(key.replace(/_one_rep_max$/, ''))} · ${formatLoadDefault(defaults[key]!)} ${units}`,
      })),
    })
  }
  return groups
}

function firstUnsetKey(defaults: ProgramStateDefaults) {
  return oneRepMaxKeys.find((key) => !hasLoadDefault(defaults[key] ?? null)) ?? null
}

function nextUnsetKey(defaults: ProgramStateDefaults, excludeKey: string) {
  return oneRepMaxKeys.find((key) => key !== excludeKey && !hasLoadDefault(defaults[key] ?? null)) ?? null
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
