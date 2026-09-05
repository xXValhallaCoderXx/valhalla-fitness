import { useState, useSyncExternalStore } from 'react'
import { Image, View } from 'react-native'
import type { WorkoutShareModel } from '@sheetless/domain/history/workout-share'
import { describeWorkoutShare, renderWorkoutShareSvg, type ShareScheme } from '@sheetless/workout-share'
import { createPreviewController } from '@sheetless/workout-share/preview-controller'
import { Button, SegmentedControl, Text } from '@/components'
import { useSheetlessTheme } from '@/lib/theme-provider'
import { spacing } from '@/lib/tokens'
import { WorkoutShareRasterizer } from './WorkoutShareRasterizer'
import type { WorkoutImage } from './workout-image'

export function WorkoutSharePreview({ model, onBack }: { model: WorkoutShareModel; onBack: () => void }) {
  const { effectiveScheme } = useSheetlessTheme()
  const [scheme, setScheme] = useState<ShareScheme>(effectiveScheme)
  const [attempt, setAttempt] = useState(0)
  const [controller] = useState(() => createPreviewController<WorkoutImage>())
  const state = useSyncExternalStore(controller.subscribe, controller.getSnapshot, controller.getSnapshot)
  const svg = renderWorkoutShareSvg(model, scheme)
  const key = model.filename + svg + attempt
  const ready = state.key === key && state.phase === 'ready' && state.image
  return (
    <View style={{ gap: spacing.md }} testID="workout-share-preview">
      <Button label="Back to summary" variant="subtle" onPress={onBack} />
      <SegmentedControl variant="segments" accessibilityLabel="Image appearance" value={scheme} onChange={setScheme}
        disabled={state.exporting} options={[{ value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }]} />
      <WorkoutShareRasterizer key={key} requestKey={key} svg={svg} filename={model.filename} controller={controller} previewVisible={!ready} />
      {ready ? (
        <Image source={{ uri: ready.uri }} accessibilityLabel={describeWorkoutShare(model)} accessible
          style={{ width: '100%', aspectRatio: 1080 / 1350 }} resizeMode="contain" testID="workout-share-image" />
      ) : <View accessibilityLiveRegion="polite"><Text>{state.error === 'generation' ? 'Could not prepare your workout image.' : 'Preparing your workout image…'}</Text></View>}
      {state.error === 'generation' ? <Button label="Retry image" onPress={() => setAttempt((value) => value + 1)} /> : null}
      {state.error === 'export' ? <View accessibilityRole="alert"><Text tone="danger">Could not export the image. Please try again.</Text></View> : null}
      {ready && !ready.canShare ? (
        <>
          <Text tone="dimmed">{ready.download ? 'Image sharing is unavailable in this browser. Download the image to share it.' : 'Image sharing is unavailable on this device.'}</Text>
          <Button label="Check sharing again" variant="default" onPress={() => setAttempt((value) => value + 1)} />
        </>
      ) : null}
      <Button label={state.error === 'export' ? 'Retry share' : 'Share image'} disabled={!ready || !ready.canShare || state.exporting}
        onPress={() => void controller.exportImage((image) => image.share())} />
      {ready && ready.download ? <Button label={state.error === 'export' ? 'Retry download' : 'Download image'} variant="default"
        disabled={state.exporting} onPress={() => void controller.exportImage((image) => image.download?.())} /> : null}
    </View>
  )
}
