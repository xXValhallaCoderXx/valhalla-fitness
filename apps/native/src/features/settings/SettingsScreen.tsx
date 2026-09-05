import { useEffect, useState } from 'react'
import { ScrollView, View } from 'react-native'
import { useNavigation } from 'expo-router'
import { usePreventRemove, type NavigationAction } from 'expo-router/react-navigation'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { User } from '@supabase/supabase-js'
import { deleteOwnAccount } from '@sheetless/data/account/data-rights'
import { updateSettings } from '@sheetless/data/account/profile'
import { deleteAccountInputSchema } from '@sheetless/domain/account/data-rights'
import type { UserProfile } from '@sheetless/domain/account/types'
import { getApiErrorMessage } from '@sheetless/domain/shared/api-error'
import { accountQueryKeys } from '@sheetless/domain/shared/query-keys'
import { Badge, Button, Panel, Screen, Text } from '@/components'
import { buildUserContext, useMe } from '@/lib/account'
import { useSession } from '@/lib/session-provider'
import { getSupabase } from '@/lib/supabase'
import { useSheetlessTheme } from '@/lib/theme-provider'
import { spacing } from '@/lib/tokens'
import { BetaFeedback } from '@/features/feedback/BetaFeedback'
import { AccountSection } from './AccountSection'
import { BodyStrengthSection } from './BodyStrengthSection'
import { DataSyncSection } from './DataSyncSection'
import { EquipmentSection } from './EquipmentSection'
import { PreferencesSection } from './PreferencesSection'
import { SettingsDialogs, type DestructiveIntent } from './SettingsDialogs'
import { SettingsSaveFooter } from './SettingsSaveFooter'
import { StrengthEstimatesSection } from './StrengthEstimatesSection'
import { useSettingsDraft, type SettingsDraftValues } from './useSettingsDraft'

export function SettingsScreen() {
  const me = useMe()
  const { user } = useSession()

  if (me.isPending) {
    return (
      <Screen padTop={false}>
        <Panel style={{ padding: spacing.md }}>
          <Text tone="dimmed">Loading settings…</Text>
        </Panel>
      </Screen>
    )
  }
  if (me.isError || !me.data || !user) {
    return (
      <Screen padTop={false}>
        <Panel style={{ gap: spacing.sm, padding: spacing.md }}>
          <Text weight={900}>Profile unavailable</Text>
          <Text size="sm" tone="dimmed">
            {me.error instanceof Error ? me.error.message : 'Sign in again to edit settings.'}
          </Text>
          <Button label="Retry" variant="default" onPress={() => void me.refetch()} />
        </Panel>
      </Screen>
    )
  }
  return <LoadedSettingsScreen key={user.id} profile={me.data} user={user} />
}

function LoadedSettingsScreen({ profile, user }: { profile: UserProfile; user: User }) {
  const navigation = useNavigation()
  const insets = useSafeAreaInsets()
  const queryClient = useQueryClient()
  const draft = useSettingsDraft(profile)
  const { effectiveScheme, previewPreference, setPreviewPreference } = useSheetlessTheme()
  const [blockedAction, setBlockedAction] = useState<NavigationAction | null>(null)
  const [bypassRemoval, setBypassRemoval] = useState(false)
  const [pendingIntent, setPendingIntent] = useState<DestructiveIntent | null>(null)
  const [readyIntent, setReadyIntent] = useState<DestructiveIntent | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const [signOutError, setSignOutError] = useState<string | null>(null)
  const [exportPending, setExportPending] = useState(false)

  useEffect(() => () => setPreviewPreference(null), [setPreviewPreference])

  useEffect(() => {
    if (draft.dirty && profile.themePreference !== draft.values.themePreference) {
      setPreviewPreference(draft.values.themePreference)
    }
  }, [draft.dirty, draft.values.themePreference, profile.themePreference, setPreviewPreference])

  usePreventRemove(draft.dirty && !bypassRemoval, ({ data }) => {
    setBlockedAction(data.action)
  })

  useEffect(() => {
    if (!bypassRemoval || !blockedAction) return
    const action = blockedAction
    setBlockedAction(null)
    navigation.dispatch(action)
  }, [blockedAction, bypassRemoval, navigation])

  const save = useMutation({
    mutationFn: (values: SettingsDraftValues) => updateSettings(buildUserContext(user), values),
    onSuccess: async (nextProfile) => {
      queryClient.setQueryData(accountQueryKeys.profile(user.id), nextProfile)
      draft.reset(nextProfile)
      setPreviewPreference(null)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: accountQueryKeys.today(user.id) }),
        queryClient.invalidateQueries({ queryKey: accountQueryKeys.program(user.id) }),
        queryClient.invalidateQueries({ queryKey: accountQueryKeys.history(user.id) }),
        queryClient.invalidateQueries({ queryKey: accountQueryKeys.sessions(user.id) }),
      ])
    },
  })
  const discard = () => {
    draft.discard()
    setPreviewPreference(null)
    save.reset()
  }
  const signOut = async () => {
    setSigningOut(true)
    setSignOutError(null)
    try {
      const { error } = await getSupabase().auth.signOut()
      if (error) throw error
      queryClient.clear()
    } catch (error) {
      setSignOutError(getApiErrorMessage(error, 'Unable to sign out.'))
      setBypassRemoval(false)
    } finally {
      setSigningOut(false)
    }
  }
  const deletion = useMutation({
    mutationFn: (confirmation: string) =>
      deleteOwnAccount(buildUserContext(user), deleteAccountInputSchema.parse({ confirmation })),
    onSuccess: async () => {
      const supabase = getSupabase()
      await supabase.auth.signOut().catch(() => undefined)
      await supabase.auth.signOut({ scope: 'local' }).catch(() => undefined)
      queryClient.clear()
    },
  })
  const runIntent = (intent: DestructiveIntent) => {
    if (draft.dirty) {
      setPendingIntent(intent)
      return
    }
    if (intent === 'signOut') void signOut()
    else setDeleteOpen(true)
  }
  useEffect(() => {
    if (!readyIntent || !bypassRemoval) return
    const intent = readyIntent
    setReadyIntent(null)
    if (intent === 'signOut') void signOut()
    else setDeleteOpen(true)
  }, [readyIntent, bypassRemoval])

  const confirmDiscardForIntent = () => {
    if (!pendingIntent) return
    const intent = pendingIntent
    discard()
    setPendingIntent(null)
    setBypassRemoval(true)
    setReadyIntent(intent)
  }
  const changeTheme = (value: SettingsDraftValues['themePreference']) => {
    draft.setThemePreference(value)
    setPreviewPreference(value === draft.baseline.themePreference ? null : value)
  }
  const saveSnapshot = () => save.mutate({
    ...draft.values,
    equipmentProfile: [...draft.values.equipmentProfile],
    programStateDefaults: { ...draft.values.programStateDefaults },
  })
  const controlsDisabled = save.isPending || deletion.isPending || signingOut || exportPending
  const destructiveDisabled = controlsDisabled || exportPending

  return (
    <>
      <Screen scroll={false} padTop={false} style={{ flex: 1, padding: 0 }}>
        <View style={{ flex: 1 }}>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{
              gap: spacing.lg,
              padding: spacing.md,
              paddingBottom: spacing.md + insets.bottom,
            }}
          >
            <Panel surface="inset" style={{ gap: spacing.xs, padding: spacing.sm }}>
              <View style={{ alignItems: 'center', flexDirection: 'row', gap: spacing.sm }}>
                <Text size="sm" weight={800} style={{ flex: 1 }}>Profile & training defaults</Text>
                <Badge tone="action">Online only</Badge>
              </View>
              <Text size="xs" tone="dimmed">
                Tune appearance, training defaults, equipment, body profile, data, and account controls.
              </Text>
              {save.isSuccess && !draft.dirty ? (
                <Text size="sm" tone="success">Settings saved.</Text>
              ) : null}
            </Panel>

            <PreferencesSection
              themePreference={draft.values.themePreference}
              effectiveScheme={effectiveScheme}
              isThemePreviewing={previewPreference !== null}
              units={draft.values.units}
              rounding={draft.values.rounding}
              autoStartTimer={draft.values.autoStartTimer}
              defaultRestSeconds={draft.values.defaultRestSeconds}
              disabled={controlsDisabled}
              onThemeChange={changeTheme}
              onUnitsChange={draft.setUnits}
              onRoundingChange={draft.setRounding}
              onAutoStartTimerChange={draft.setAutoStartTimer}
              onDefaultRestSecondsChange={draft.setDefaultRestSeconds}
            />

            <BodyStrengthSection
              user={user}
              units={draft.values.units}
              sex={draft.values.sex}
              settingsDisabled={controlsDisabled}
              onSexChange={draft.setSex}
            />

            <StrengthEstimatesSection
              programStateDefaults={draft.values.programStateDefaults}
              estimateInputs={draft.estimateInputs}
              estimateErrors={draft.estimateErrors}
              units={draft.values.units}
              rounding={draft.values.rounding}
              disabled={controlsDisabled}
              onInputChange={draft.setEstimateInput}
              onValueChange={draft.setEstimateValue}
            />

            <EquipmentSection
              equipmentProfile={draft.values.equipmentProfile}
              disabled={controlsDisabled}
              onToggle={draft.toggleEquipment}
            />

            <DataSyncSection
              user={user}
              disabled={draft.dirty || controlsDisabled}
              onPendingChange={setExportPending}
            />

            <BetaFeedback user={user} />
            <AccountSection
              displayName={profile.displayName}
              email={profile.email}
              signingOut={signingOut}
              signOutError={signOutError}
              destructiveDisabled={destructiveDisabled}
              onSignOut={() => runIntent('signOut')}
              onDelete={() => runIntent('delete')}
            />
          </ScrollView>

          <SettingsSaveFooter
            visible={draft.dirty}
            isSaving={save.isPending}
            hasValidationErrors={draft.hasValidationErrors}
            error={save.isError ? getApiErrorMessage(save.error, 'Unable to save settings.') : null}
            onDiscard={discard}
            onSave={saveSnapshot}
          />
        </View>
      </Screen>

      <SettingsDialogs
        leaveOpen={Boolean(blockedAction)}
        savePending={save.isPending}
        pendingIntent={pendingIntent}
        deleteOpen={deleteOpen}
        deletePending={deletion.isPending}
        deleteError={deletion.isError
          ? getApiErrorMessage(deletion.error, 'Unable to delete your account.')
          : null}
        onCancelLeave={() => setBlockedAction(null)}
        onConfirmLeave={() => {
          discard()
          setBypassRemoval(true)
        }}
        onCancelIntent={() => setPendingIntent(null)}
        onConfirmIntent={confirmDiscardForIntent}
        onCloseDelete={() => {
          if (!deletion.isPending) {
            setDeleteOpen(false)
            deletion.reset()
            setBypassRemoval(false)
          }
        }}
        onConfirmDelete={(confirmation) => deletion.mutate(confirmation)}
      />
    </>
  )
}
