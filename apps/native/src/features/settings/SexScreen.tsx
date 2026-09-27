import { router } from 'expo-router'
import { SettingsProfileBoundary } from './SettingsProfileBoundary'
import { SexSheet } from './profile/SexSheet'

export function SexScreen() {
  return <SettingsProfileBoundary title="Sex">{(profile, user) =>
    <SexSheet key={user.id} profile={profile} user={user}
      onClose={() => router.canGoBack() ? router.back() : router.replace('/you')} />
  }</SettingsProfileBoundary>
}
