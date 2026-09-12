import { notifications } from '@mantine/notifications'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useRouter, useRouterState } from '@tanstack/react-router'
import { useEffect, useMemo, useRef, useState } from 'react'
import { toggleEquipmentProfileItem } from '@sheetless/domain/account/equipment-profile'
import type { RequiredEquipment } from '@sheetless/domain/movement/types'
import { Page } from '~/components'
import { useRequiredAccountId } from '~/domains/account/components/AccountIdentityProvider'
import {
  buildLiftOptions,
  calculateOneRepMaxFromKnownSet,
  convertProgramStateDefaults,
  firstUnsetKey,
  hasLoadDefault,
  nextUnsetKey,
  oneRepMaxKeys,
  sameNumberRecord,
  sameStringSet,
  type KnownSetInput,
} from '~/domains/account/lib/settings-form'
import { updateSettingsFn } from '~/domains/account/server/profile-functions'
import { hasAllStrengthEstimates } from '~/domains/onboarding/onboarding-progress'
import { buildEstimatesSteps } from '~/domains/onboarding/onboarding-tour'
import { useOnboardingTour } from '~/domains/onboarding/useOnboardingTour'
import { defaultProgramStateDefaults } from '~/domains/program/lib/program-state-defaults'
import { todayQueryOptions } from '~/domains/session/queries'
import { track } from '~/shared/lib/analytics'
import { getApiErrorMessage } from '~/shared/lib/api-error'
import { prefersReducedMotion } from '~/shared/lib/reduced-motion'
import { accountQueryKeys } from '~/shared/lib/query-keys'
import type { Sex, ThemePreference, UserProfile } from '~/domains/account'
import type { ProgramStateDefaults, Unit } from '~/shared/types'
import { OneRepMaxCalculatorModal } from './OneRepMaxCalculatorModal'
import { sectionIds, useActiveSection } from './SettingsSidebar'
import { SettingsContent } from './SettingsContent'

export function SettingsForm({ me }: { me: UserProfile }) {
  const router = useRouter()
  const userId = useRequiredAccountId()
  const { start: startEstimatesTour } = useOnboardingTour(buildEstimatesSteps, 'estimates')
  const activeSessionId = useQuery(todayQueryOptions(userId)).data?.activeSession?.sessionId ?? null
  const activeSection = useActiveSection(sectionIds)
  const focusParam = useRouterState({ select: (state) => (state.location.search as { focus?: string }).focus })

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

  const arrivedFromEstimatesRef = useRef(false)
  useEffect(() => {
    if (focusParam === 'estimates') arrivedFromEstimatesRef.current = true
  }, [focusParam])

  const [units, setUnits] = useState<Unit>(me.units ?? 'kg')
  const [rounding, setRounding] = useState(me.rounding ?? 2.5)
  const [equipmentProfile, setEquipmentProfile] = useState<string[]>(me.equipmentProfile ?? [])
  const [sex, setSex] = useState<Sex | null>(me.sex ?? null)
  const [themePreference, setThemePreference] = useState<ThemePreference>(me.themePreference ?? 'system')
  const [programStateDefaults, setProgramStateDefaults] = useState<ProgramStateDefaults>(
    me.programStateDefaults ?? defaultProgramStateDefaults(me.units ?? 'kg'),
  )
  const [autoStartTimer, setAutoStartTimer] = useState(me.autoStartTimer ?? true)
  const [defaultRestSeconds, setDefaultRestSeconds] = useState(me.defaultRestSeconds ?? 120)
  const [showOneRepMaxCalculator, setShowOneRepMaxCalculator] = useState(false)
  const [selectedOneRepMaxKey, setSelectedOneRepMaxKey] = useState(oneRepMaxKeys[0]!)
  const [knownSetInput, setKnownSetInput] = useState<KnownSetInput>({ weight: '', reps: '', rir: '0' })

  const hasPendingChanges = useMemo(
    () =>
      units !== me.units ||
      rounding !== me.rounding ||
      sex !== (me.sex ?? null) ||
      themePreference !== (me.themePreference ?? 'system') ||
      autoStartTimer !== (me.autoStartTimer ?? true) ||
      defaultRestSeconds !== (me.defaultRestSeconds ?? 120) ||
      !sameNumberRecord(programStateDefaults, me.programStateDefaults ?? defaultProgramStateDefaults(me.units ?? units)) ||
      !sameStringSet(equipmentProfile, me.equipmentProfile ?? []),
    [autoStartTimer, defaultRestSeconds, equipmentProfile, me, programStateDefaults, rounding, sex, themePreference, units],
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
          autoStartTimer,
          defaultRestSeconds,
        },
      }),
    onSuccess: (next) => {
      router.options.context.queryClient.setQueryData(accountQueryKeys.profile(userId), next)
      void router.options.context.queryClient.invalidateQueries({
        queryKey: accountQueryKeys.historyDashboard(userId),
      })
      if (next) {
        setUnits(next.units)
        setRounding(next.rounding)
        setEquipmentProfile(next.equipmentProfile)
        setSex(next.sex ?? null)
        setThemePreference(next.themePreference)
        setProgramStateDefaults(next.programStateDefaults)
        setAutoStartTimer(next.autoStartTimer)
        setDefaultRestSeconds(next.defaultRestSeconds)
      }
      notifications.show({ color: 'success', title: 'Settings saved', message: 'Your preferences were updated.' })
      if (
        arrivedFromEstimatesRef.current &&
        next &&
        !next.onboardingCompleted &&
        hasAllStrengthEstimates(next.programStateDefaults)
      ) {
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
    setUnits(me.units)
    setRounding(me.rounding)
    setEquipmentProfile(me.equipmentProfile ?? [])
    setSex(me.sex ?? null)
    setThemePreference(me.themePreference ?? 'system')
    setProgramStateDefaults(me.programStateDefaults ?? defaultProgramStateDefaults(me.units))
    setAutoStartTimer(me.autoStartTimer ?? true)
    setDefaultRestSeconds(me.defaultRestSeconds ?? 120)
  }

  const handleUnitsChange = (nextUnits: Unit) => {
    setProgramStateDefaults((current) =>
      convertProgramStateDefaults(current, units, nextUnits, rounding),
    )
    setUnits(nextUnits)
  }

  const updateProgramStateDefault = (key: string, value: number | null) => {
    setProgramStateDefaults((current) => ({ ...current, [key]: value }))
  }

  const toggleEquipment = (item: RequiredEquipment) => {
    setEquipmentProfile((current) =>
      toggleEquipmentProfileItem(current, item),
    )
  }

  const calculatedOneRepMax = useMemo(
    () => calculateOneRepMaxFromKnownSet(knownSetInput, rounding),
    [knownSetInput, rounding],
  )
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
    setProgramStateDefaults((current) => ({ ...current, [selectedOneRepMaxKey]: calculatedOneRepMax }))
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
      <SettingsContent
        values={{
          units,
          rounding,
          equipmentProfile,
          sex,
          themePreference,
          programStateDefaults,
          autoStartTimer,
          defaultRestSeconds,
        }}
        actions={{
          onThemeChange: setThemePreference,
          onUnitsChange: handleUnitsChange,
          onRoundingChange: setRounding,
          onAutoStartTimerChange: setAutoStartTimer,
          onDefaultRestSecondsChange: setDefaultRestSeconds,
          onSexChange: setSex,
          onUpdateDefault: updateProgramStateDefault,
          onOpenCalculator: openOneRepMaxCalculator,
          onToggleEquipment: toggleEquipment,
          onDiscard: discardChanges,
          onSave: () => updateMutation.mutate(),
        }}
        me={me}
        activeSection={activeSection}
        activeSessionId={activeSessionId}
        email={me.email ?? ''}
        hasPendingChanges={hasPendingChanges}
        isSaving={updateMutation.isPending}
      />

      <OneRepMaxCalculatorModal
        opened={showOneRepMaxCalculator}
        selectedKey={selectedOneRepMaxKey}
        liftOptions={liftOptions}
        units={units}
        knownSetInput={knownSetInput}
        calculatedValue={calculatedOneRepMax}
        canApply={hasLoadDefault(calculatedOneRepMax)}
        isLastUnset={nextUnsetOneRepMaxKey === null}
        setCount={setOneRepMaxCount}
        totalCount={oneRepMaxKeys.length}
        onSelectedKeyChange={handleSelectedKeyChange}
        onKnownSetChange={(field, value) => setKnownSetInput((current) => ({ ...current, [field]: value }))}
        onApplyAndClose={applyCalculatedOneRepMax}
        onApplyAndNext={applyCalculatedOneRepMaxAndNext}
        onClose={() => setShowOneRepMaxCalculator(false)}
      />
    </Page>
  )
}
