import { Badge, Button, Select } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useRouter, useRouterState } from '@tanstack/react-router'
import { Scale } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Caption, EmptyState, Page, PageHeader, PageLoadError, PageSkeleton, Panel, SectionLabel, Text } from '~/components'
import {
  buildLiftOptions,
  calculateOneRepMaxFromKnownSet,
  firstUnsetKey,
  hasLoadDefault,
  nextUnsetKey,
  oneRepMaxKeys,
  sameNumberRecord,
  sameStringSet,
  type KnownSetInput,
} from '~/domains/account/lib/settings-form'
import { meQueryOptions } from '~/domains/account/queries'
import { updateSettingsFn } from '~/domains/account/server/profile-functions'
import { hasAllStrengthEstimates } from '~/domains/onboarding/onboarding-progress'
import { buildEstimatesSteps } from '~/domains/onboarding/onboarding-tour'
import { useOnboardingTour } from '~/domains/onboarding/useOnboardingTour'
import { defaultProgramStateDefaults } from '~/domains/program/lib/program-state-defaults'
import { todayQueryOptions } from '~/domains/session/queries'
import { track } from '~/shared/lib/analytics'
import { getApiErrorMessage } from '~/shared/lib/api-error'
import { prefersReducedMotion } from '~/shared/lib/reduced-motion'
import type { ProgramStateDefaults, Sex, ThemePreference, Unit, UserProfile } from '~/shared/types'
import { AccountSection } from './settings/AccountSection'
import { BodyweightLogger } from './settings/BodyweightLogger'
import { DataSyncSection } from './settings/DataSyncSection'
import { EquipmentSection } from './settings/EquipmentSection'
import { OneRepMaxCalculatorModal } from './settings/OneRepMaxCalculatorModal'
import { PreferencesSection } from './settings/PreferencesSection'
import { SettingsSection } from './settings/SettingsSection'
import { sectionIds, SettingsSidebar, useActiveSection } from './settings/SettingsSidebar'
import { StrengthEstimatesSection } from './settings/StrengthEstimatesSection'

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

  // Latch "arrived via the onboarding Set-estimates button" before the `focus` param self-clears
  // above, so the save handler can redirect to Today. Per-mount, so a later organic /settings visit
  // starts fresh (false) and is never redirected.
  const arrivedFromEstimatesRef = useRef(false)
  useEffect(() => {
    if (focusParam === 'estimates') arrivedFromEstimatesRef.current = true
  }, [focusParam])

  const [units, setUnits] = useState<Unit>(me?.units ?? 'kg')
  const [rounding, setRounding] = useState(me?.rounding ?? 2.5)
  const [equipmentProfile, setEquipmentProfile] = useState<string[]>(me?.equipmentProfile ?? [])
  const [sex, setSex] = useState<Sex | null>(me?.sex ?? null)
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
        sex !== (me?.sex ?? null) ||
        themePreference !== (me?.themePreference ?? 'system') ||
        !sameNumberRecord(programStateDefaults, me?.programStateDefaults ?? defaultProgramStateDefaults(me?.units ?? units)) ||
        !sameStringSet(equipmentProfile, me?.equipmentProfile ?? [])),
    [equipmentProfile, me, programStateDefaults, rounding, sex, themePreference, units],
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
          sex,
        },
      }),
    onSuccess: (next) => {
      router.options.context.queryClient.setQueryData(['me'], next)
      // Sex (and units) feed the DOTS strength score, so refresh insights too.
      void router.options.context.queryClient.invalidateQueries({ queryKey: ['history', 'dashboard'] })
      if (next) {
        setUnits(next.units)
        setRounding(next.rounding)
        setEquipmentProfile(next.equipmentProfile)
        setSex(next.sex ?? null)
        setThemePreference(next.themePreference)
        setProgramStateDefaults(next.programStateDefaults)
      }
      notifications.show({ color: 'success', title: 'Settings saved', message: 'Your preferences were updated.' })
      // During onboarding, a user who arrived via the "Set estimates" button returns to Today once
      // every main-lift estimate is set. Organic visitors (ref false), finished users, and partial
      // saves stay put.
      if (arrivedFromEstimatesRef.current && next && !next.onboardingCompleted && hasAllStrengthEstimates(next.programStateDefaults)) {
        void router.navigate({ to: '/today' })
      }
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
    setSex(me.sex ?? null)
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

  const toggleEquipment = (item: string) => {
    setEquipmentProfile((current) =>
      current.includes(item) ? current.filter((value) => value !== item) : [...current, item],
    )
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

  return (
    <Page>
      <PageHeader title="Settings" eyebrow="Account" actions={<Badge color="success">Synced</Badge>}>
        Programme defaults, equipment profile, and sync preferences.
      </PageHeader>

      {hasPendingChanges ? (
        <Panel
          className="sticky top-0 z-30 mb-4"
          p="sm"
          style={{
            borderColor: 'var(--vf-warning-border)',
            // The warning tint is translucent; layer it over the Panel's opaque surface so
            // scrolled content can't bleed through this sticky banner.
            backgroundImage: 'linear-gradient(var(--vf-warning-soft), var(--vf-warning-soft))',
          }}
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
          <PreferencesSection
            themePreference={themePreference}
            units={units}
            rounding={rounding}
            onThemeChange={setThemePreference}
            onUnitsChange={handleUnitsChange}
            onRoundingChange={setRounding}
          />

          <SettingsSection
            id="body-strength"
            icon={Scale}
            title="Body & Strength Score"
            description="Bodyweight and sex feed the DOTS relative-strength score on the Insights page."
          >
            <Panel p="md">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid content-start gap-1.5">
                  <SectionLabel>Sex</SectionLabel>
                  <Select
                    aria-label="Sex"
                    placeholder="Prefer not to say"
                    data={[
                      { value: 'male', label: 'Male' },
                      { value: 'female', label: 'Female' },
                    ]}
                    value={sex}
                    onChange={(value) => setSex((value as Sex | null) ?? null)}
                    clearable
                  />
                  <Caption mt={1} lh={1.4}>
                    Only used for DOTS relative-strength scoring on the Insights page.
                  </Caption>
                </div>
                <BodyweightLogger units={units} />
              </div>
            </Panel>
          </SettingsSection>

          <StrengthEstimatesSection
            programStateDefaults={programStateDefaults}
            units={units}
            onUpdateDefault={updateProgramStateDefault}
            onOpenCalculator={openOneRepMaxCalculator}
          />

          <EquipmentSection equipmentProfile={equipmentProfile} onToggle={toggleEquipment} />

          <DataSyncSection activeSessionId={activeSessionId} />

          <AccountSection email={me?.email ?? ''} />
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
