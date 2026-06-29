import { useMutation, useQuery } from '@tanstack/react-query'
import { Badge, Button, Modal, NativeSelect, SegmentedControl, TextInput } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { useRouter, useRouterState } from '@tanstack/react-router'
import { ArrowRight, Calculator, Check, Cloud, Compass, Download, Dumbbell, Gauge, Layers, LogOut, Monitor, Moon, RefreshCw, SlidersHorizontal, Sun, User, X, type LucideIcon } from 'lucide-react'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { getApiErrorMessage } from '~/shared/lib/api-error'
import { track } from '~/shared/lib/analytics'
import { prefersReducedMotion } from '~/shared/lib/reduced-motion'
import { getMovementName } from '~/domains/movement/lib/movements'
import { e1rm, mround } from '~/domains/program/lib/progression'
import { authUserQueryOptions, meQueryOptions } from '~/domains/account/queries'
import { defaultProgramStateDefaults } from '~/domains/program/lib/templates'
import { signOutFn } from '~/domains/account/server/auth-functions'
import { updateSettingsFn } from '~/domains/account/server/profile-functions'
import { todayQueryOptions } from '~/domains/session/queries'
import { buildEstimatesSteps } from '~/domains/onboarding/onboarding-tour'
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

const sectionIds = settingsSections.map((section) => section.id)

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
  const { start: startEstimatesTour } = useOnboardingTour(buildEstimatesSteps, 'estimates')
  const activeSessionId = useQuery(todayQueryOptions()).data?.activeSession?.sessionId ?? null
  const activeSection = useActiveSection(sectionIds)

  // Arriving from the onboarding checklist (`?focus=estimates`): scroll to the section and walk the
  // user through the inputs + 1RM calculator.
  const focusParam = useRouterState({ select: (state) => (state.location.search as { focus?: string }).focus })
  // No handled-ref guard: a client-side route transition mounts this component twice while
  // preserving refs, so a ref guard would let the throwaway mount "use up" the guard and block the
  // surviving mount from ever scheduling the tour. Keying purely off the (stable) `focusParam` plus a
  // self-clearing timer is resilient — whichever mount survives schedules and fires it. The param is
  // cleared only once the tour is up (so a refresh/back doesn't re-pop it), after the transition has
  // long settled, which is a plain re-render (the started driver lives outside React and persists).
  useEffect(() => {
    if (focusParam !== 'estimates') return
    const timer = window.setTimeout(() => {
      if (!document.querySelector('[data-tour="settings-estimates"]')) return
      document.getElementById('programme-loads')?.scrollIntoView({
        behavior: prefersReducedMotion() ? 'auto' : 'smooth',
        block: 'start',
      })
      track('onboarding_deeplink', { target: 'estimates' })
      startEstimatesTour()
      void router.navigate({ to: '/settings', search: {}, replace: true })
    }, 400)
    return () => window.clearTimeout(timer)
  }, [focusParam, router, startEstimatesTour])

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
          className="sticky top-0 z-30 mb-4"
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

      <div className="grid gap-3 lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-6">
        <SettingsSidebar active={activeSection} />

        <div className="space-y-8">
          <SettingsSection
            id="preferences"
            icon={SlidersHorizontal}
            title="Preferences"
            description="Units and rounding are reused when you start a new programme."
          >
            <Panel p="md">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid content-start gap-1.5">
                  <SectionLabel>Theme</SectionLabel>
                  <SegmentedControl
                    fullWidth
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
                  <Caption mt={1}>{themeOptions.find((option) => option.value === themePreference)?.description}</Caption>
                </div>
                <div className="grid grid-cols-2 content-start gap-3">
                  <div className="grid content-start gap-1.5">
                    <SectionLabel>Units</SectionLabel>
                    <SegmentedControl
                      fullWidth
                      value={units}
                      onChange={(value) => handleUnitsChange(value as Unit)}
                      data={[
                        { value: 'kg', label: 'kg' },
                        { value: 'lb', label: 'lb' },
                      ]}
                    />
                  </div>
                  <div className="grid content-start gap-1.5">
                    <SectionLabel>Round</SectionLabel>
                    <SegmentedControl
                      fullWidth
                      value={String(rounding)}
                      onChange={(value) => setRounding(Number(value))}
                      data={roundingOptions}
                    />
                  </div>
                </div>
              </div>
            </Panel>
          </SettingsSection>

          <SettingsSection
            id="programme-loads"
            icon={Gauge}
            title="Strength Estimates"
            description="Saved estimated 1RMs are used to suggest starting values when you begin a programme."
            actions={
              <Button data-tour="settings-e1rm-calc" size="sm" onClick={openOneRepMaxCalculator}>
                <Calculator size={14} />
                Calculate from known sets
              </Button>
            }
          >
            <Panel p="md">
              <div data-tour="settings-estimates" className="grid grid-cols-2 gap-2 md:[grid-template-columns:repeat(auto-fit,minmax(11rem,1fr))]">
                {oneRepMaxKeys.map((key) => {
                  const value = programStateDefaults[key] ?? null
                  const label = strengthEstimateLabel(key)
                  const isSet = hasLoadDefault(value)
                  return (
                    <Panel key={key} surface="inset" p="xs" className="grid min-w-0 gap-1.5">
                      <div className="flex min-w-0 items-center justify-between gap-1">
                        <SectionLabel className="min-w-0" lh={1.1} truncate>
                          {label}
                        </SectionLabel>
                        <Badge className="shrink-0" color={isSet ? 'success' : 'warning'}>
                          {isSet ? 'Set' : 'Unset'}
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
                    </Panel>
                  )
                })}
              </div>
              <Caption mt="md" lh={1.4}>
                These estimates are global defaults. Active programmes keep their own load values after start, and
                history can still show e1RM trends from logged sets.
              </Caption>
            </Panel>
          </SettingsSection>

          <SettingsSection
            id="equipment"
            icon={Dumbbell}
            title="Equipment Profile"
            description="Select available equipment to filter alternatives."
            actions={
              <Badge color="action" variant="light">
                {equipmentProfile.length} of {equipmentOptions.length} selected
              </Badge>
            }
          >
            <Panel p="md">
              <div className="grid grid-cols-2 gap-2 md:[grid-template-columns:repeat(auto-fit,minmax(12rem,1fr))]">
                {equipmentOptions.map((item) => {
                  const selected = equipmentProfile.includes(item)
                  return (
                    <button
                      key={item}
                      type="button"
                      aria-pressed={selected}
                      onClick={() =>
                        setEquipmentProfile((current) =>
                          selected ? current.filter((value) => value !== item) : [...current, item],
                        )
                      }
                      className="flex items-center gap-3 rounded-[var(--mantine-radius-md)] px-3 py-2.5 text-left transition-colors"
                      style={{
                        border: `1px solid ${selected ? 'var(--vf-action-border)' : 'var(--mantine-color-default-border)'}`,
                        backgroundColor: selected ? 'var(--vf-action-soft)' : 'var(--mantine-color-default)',
                      }}
                    >
                      <span
                        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md"
                        style={{
                          border: `1px solid ${selected ? 'var(--vf-action-text)' : 'var(--mantine-color-default-border)'}`,
                          backgroundColor: selected ? 'var(--vf-action-text)' : 'transparent',
                          color: 'var(--mantine-color-white)',
                        }}
                      >
                        {selected ? <Check size={15} strokeWidth={3} /> : null}
                      </span>
                      <Text
                        component="span"
                        size="sm"
                        fw={700}
                        truncate
                        c={selected ? 'var(--vf-action-text)' : undefined}
                      >
                        {formatEquipmentLabel(item)}
                      </Text>
                    </button>
                  )
                })}
              </div>
            </Panel>
          </SettingsSection>

          <SettingsSection
            id="data-sync"
            icon={Cloud}
            title="Data & Sync"
            description="Manage training data and sync status."
          >
            <Panel p={0} className="divide-y divide-[var(--mantine-color-default-border)]">
              <DataRow
                icon={RefreshCw}
                title="Sync Status"
                caption="Current browser session"
                action={<Badge color="success">Synced</Badge>}
              />
              <DataRow
                icon={Download}
                title="Export Data"
                caption="Export is a future module."
                action={
                  <div className="flex items-center gap-2">
                    <Badge color="warning" variant="light">Soon</Badge>
                    <Button variant="default" size="xs" disabled>Export</Button>
                  </div>
                }
              />
              <DataRow
                icon={Compass}
                title="Getting-started tour"
                caption="Replay the welcome walkthrough."
                action={<Button variant="default" size="xs" onClick={() => startTour()}>Replay tour</Button>}
              />
              <DataRow
                icon={Layers}
                title="Workout walkthrough"
                caption={
                  activeSessionId
                    ? 'Replay the in-session coach-marks.'
                    : 'Start a workout to replay the in-session coach-marks.'
                }
                action={
                  <Button
                    variant="default"
                    size="xs"
                    disabled={!activeSessionId}
                    onClick={() => {
                      if (!activeSessionId) return
                      void router.navigate({
                        to: '/sessions/$sessionId',
                        params: { sessionId: activeSessionId },
                        search: { tour: 'live' },
                      })
                    }}
                  >
                    Replay walkthrough
                  </Button>
                }
              />
            </Panel>
          </SettingsSection>

          <SettingsSection
            id="account"
            icon={User}
            title="Account"
            description="Login identity and session controls."
          >
            <Panel p="md">
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
  icon: Icon,
  title,
  description,
  actions,
  children,
}: {
  id: string
  icon: LucideIcon
  title: string
  description: string
  actions?: ReactNode
  children: ReactNode
}) {
  return (
    <section id={id} className="scroll-mt-24">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
            style={{ backgroundColor: 'var(--vf-action-soft)', border: '1px solid var(--vf-action-border)' }}
          >
            <Icon size={20} color="var(--vf-action-text)" />
          </div>
          <div className="min-w-0">
            <Heading order={2} size="h5">{title}</Heading>
            <Caption size="0.625rem">{description}</Caption>
          </div>
        </div>
        {actions ? <div className="shrink-0">{actions}</div> : null}
      </div>
      {children}
    </section>
  )
}

function SettingsSidebar({ active }: { active: string }) {
  return (
    <aside className="hidden lg:block">
      <div className="sticky top-0 flex flex-col gap-3">
        <Panel p="xs" className="flex flex-col">
          <SectionLabel className="px-2 pb-1 pt-1">Settings</SectionLabel>
          {settingsSections.map((item) => {
            const Icon = item.icon
            const isActive = active === item.id
            return (
              <a
                key={item.id}
                href={`#${item.id}`}
                onClick={(event) => {
                  event.preventDefault()
                  scrollToSection(item.id)
                }}
                className="flex items-center gap-2.5 rounded-md px-2.5 py-2 transition-colors focus-visible:outline-none"
                style={{
                  backgroundColor: isActive ? 'var(--vf-action-soft)' : undefined,
                  color: isActive ? 'var(--vf-action-text)' : 'var(--mantine-color-dimmed)',
                }}
              >
                <Icon size={16} color="currentColor" />
                <Text component="span" size="sm" fw={700} c="currentColor">{item.label}</Text>
              </a>
            )
          })}
        </Panel>
        <Panel surface="inset" p="sm">
          <div className="flex items-center gap-2">
            <Cloud size={16} color="var(--vf-action-text)" />
            <Text size="sm" fw={800}>Local-first</Text>
          </div>
          <Caption mt={6} lh={1.45}>
            Changes save on this device and sync to your Supabase account automatically.
          </Caption>
        </Panel>
      </div>
    </aside>
  )
}

function DataRow({
  icon: Icon,
  title,
  caption,
  action,
}: {
  icon: LucideIcon
  title: string
  caption: string
  action: ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-3 p-3">
      <div className="flex min-w-0 items-center gap-3">
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md"
          style={{ backgroundColor: 'var(--vf-surface-2)' }}
        >
          <Icon size={16} color="var(--mantine-color-dimmed)" />
        </div>
        <div className="min-w-0">
          <Text size="sm" fw={700}>{title}</Text>
          <Caption>{caption}</Caption>
        </div>
      </div>
      <div className="shrink-0">{action}</div>
    </div>
  )
}

function scrollToSection(id: string) {
  document.getElementById(id)?.scrollIntoView({
    behavior: prefersReducedMotion() ? 'auto' : 'smooth',
    block: 'start',
  })
}

function useActiveSection(ids: string[]) {
  const [active, setActive] = useState(ids[0] ?? '')
  useEffect(() => {
    const elements = ids
      .map((id) => document.getElementById(id))
      .filter((element): element is HTMLElement => Boolean(element))
    if (!elements.length) return
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
        if (visible[0]) setActive(visible[0].target.id)
      },
      { rootMargin: '-72px 0px -55% 0px', threshold: 0 },
    )
    elements.forEach((element) => observer.observe(element))
    return () => observer.disconnect()
  }, [ids])
  return active
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
        inner: '!items-end !p-0 sm:!items-center sm:!p-4',
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
  // Just the lift name — the "Estimated 1RMs" section header already provides the context,
  // and the full "… estimated 1RM" truncated on mobile.
  return getMovementName(movementId)
}

function formatEquipmentLabel(value: string) {
  return value
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}
