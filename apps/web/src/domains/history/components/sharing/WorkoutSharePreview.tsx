import { useEffect, useState, useSyncExternalStore } from 'react'
import { Button, Group, Image, SegmentedControl, Stack, useComputedColorScheme } from '@mantine/core'
import type { WorkoutShareModel } from '@sheetless/domain/history/workout-share'
import { describeWorkoutShare, renderWorkoutShareSvg, type ShareScheme } from '@sheetless/workout-share'
import { createPreviewController } from '@sheetless/workout-share/preview-controller'
import { Text } from '~/components'
import { downloadBrowserImage, prepareBrowserImage, shareBrowserImage, type BrowserShareImage } from './browser-image'

export function WorkoutSharePreview({ model, onBack }: { model: WorkoutShareModel; onBack: () => void }) {
  const resolvedScheme = useComputedColorScheme('dark', { getInitialValueInEffect: false })
  const [scheme, setScheme] = useState<ShareScheme>(resolvedScheme)
  const [controller] = useState(() => createPreviewController<BrowserShareImage>())
  const state = useSyncExternalStore(controller.subscribe, controller.getSnapshot, controller.getSnapshot)
  const svg = renderWorkoutShareSvg(model, scheme)
  const key = model.filename + svg
  const generate = () => controller.generate(key, () => prepareBrowserImage(svg, model.filename))
  useEffect(() => {
    void controller.generate(key, () => prepareBrowserImage(svg, model.filename))
    return () => controller.cancel()
  }, [controller, key, svg, model.filename])
  const ready = state.key === key && state.phase === 'ready' && state.image
  return (
    <Stack gap="sm" data-testid="workout-share-preview">
      <Button variant="subtle" onClick={onBack}>Back to summary</Button>
      <SegmentedControl
        aria-label="Image appearance"
        value={scheme}
        onChange={(value) => setScheme(value as ShareScheme)}
        disabled={state.exporting}
        data={[{ value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }]}
      />
      {ready ? (
        <Image src={ready.uri} alt={describeWorkoutShare(model)} w="100%" maw={432} mx="auto" data-testid="workout-share-image" />
      ) : <Text role="status">{state.error === 'generation' ? 'Could not prepare your workout image.' : 'Preparing your workout image…'}</Text>}
      {state.error === 'generation' ? <Button onClick={() => void generate()}>Retry image</Button> : null}
      {state.error === 'export' ? <Text role="alert" tone="danger">Could not export the image. Try sharing or downloading again.</Text> : null}
      {ready && !ready.canShare ? <Text size="sm" tone="dimmed">Image sharing is unavailable in this browser. Download the image to share it.</Text> : null}
      <Group gap="sm">
        {ready && ready.canShare ? (
          <Button disabled={state.exporting} onClick={() => void controller.exportImage(shareBrowserImage)}>
            {state.error === 'export' ? 'Retry share' : 'Share image'}
          </Button>
        ) : null}
        <Button variant="default" disabled={!ready || state.exporting} onClick={() => void controller.exportImage(downloadBrowserImage)}>
          {state.error === 'export' ? 'Retry download' : 'Download image'}
        </Button>
      </Group>
    </Stack>
  )
}
