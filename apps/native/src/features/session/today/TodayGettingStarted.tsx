import { useState } from 'react'
import { View } from 'react-native'
import { router } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import type { User } from '@supabase/supabase-js'
import { Button, Caption, Heading, Panel, SectionLabel, Text } from '@/components'
import { FindMyPlanSheet } from '@/features/templates/find-my-plan/FindMyPlanSheet'
import { templatesQueryOptions } from '@/features/templates/queries'
import { spacing } from '@/lib/tokens'
import { StartBlankWorkoutButton } from './StartBlankWorkoutButton'

export function TodayGettingStarted({ user, returning = false }: { user: User; returning?: boolean }) {
  const [finderOpen, setFinderOpen] = useState(false)
  const templates = useQuery({ ...templatesQueryOptions(user), enabled: finderOpen })
  return (
    <>
      <Panel style={{ padding: spacing.lg, gap: spacing.md }}>
        <View style={{ gap: spacing.xs }}>
          <SectionLabel>{returning ? 'Your next chapter' : 'Getting started'}</SectionLabel>
          <Heading order={2}>Choose a programme</Heading>
          <Text tone="dimmed">Find a plan that fits your training, then preview every workout before you start.</Text>
        </View>
        <Button label="Find My Plan" fullWidth onPress={() => setFinderOpen(true)} loading={finderOpen && templates.isPending} />
        <Button label="Browse programmes" variant="default" fullWidth onPress={() => router.navigate('/(tabs)/templates')} testID="today-browse-programs" />
        {finderOpen && templates.isError ? (
          <View style={{ gap: spacing.xs }}>
            <Text size="sm" tone="danger">{templates.error instanceof Error ? templates.error.message : 'Programmes could not load.'}</Text>
            <Button label="Retry programmes" variant="default" loading={templates.isFetching} onPress={() => void templates.refetch()} />
          </View>
        ) : null}
      </Panel>
      <Panel surface="inset" style={{ padding: spacing.lg, gap: spacing.sm }}>
        <Heading order={3}>Just here to train?</Heading>
        <Text size="sm" tone="dimmed">Start a blank workout and add movements as you go. You can choose a programme later.</Text>
        <StartBlankWorkoutButton />
        <Caption>Workout saves need a connection.</Caption>
      </Panel>
      {finderOpen && templates.isSuccess ? (
        <FindMyPlanSheet
          open
          user={user}
          templates={templates.data}
          onClose={() => setFinderOpen(false)}
          onViewTemplate={(templateId) => {
            setFinderOpen(false)
            router.push({ pathname: '/template/[templateId]', params: { templateId } })
          }}
        />
      ) : null}
    </>
  )
}
