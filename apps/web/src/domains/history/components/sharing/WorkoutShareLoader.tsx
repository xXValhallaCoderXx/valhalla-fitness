import { Component, lazy, Suspense, type ComponentType, type LazyExoticComponent } from 'react'
import { Button, Stack } from '@mantine/core'
import type { WorkoutShareModel } from '@sheetless/domain/history/workout-share'
import { Text } from '~/components'

export type WorkoutShareViewProps = { model: WorkoutShareModel; onBack: () => void }
type Props = WorkoutShareViewProps & { load: () => Promise<{ default: ComponentType<WorkoutShareViewProps> }> }
type State = { failed: boolean; View: LazyExoticComponent<ComponentType<WorkoutShareViewProps>> }

/** Keep a failed preview chunk inside the summary and allow a fresh import on retry. */
export class WorkoutShareLoader extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { failed: false, View: lazy(props.load) }
  }

  static getDerivedStateFromError() { return { failed: true } }

  private retry = () => this.setState({ failed: false, View: lazy(this.props.load) })

  render() {
    const { model, onBack } = this.props
    const { failed, View } = this.state
    const fallback = <Stack gap="sm">
      <Button variant="subtle" onClick={onBack}>Back to summary</Button>
      <Text role={failed ? 'alert' : 'status'}>
        {failed ? 'Could not load the image preview. Try again, or reload the page if the problem continues.' : 'Loading image preview…'}
      </Text>
      {failed ? <Button onClick={this.retry}>Retry preview</Button> : null}
    </Stack>
    return failed ? fallback : <Suspense fallback={fallback}><View model={model} onBack={onBack} /></Suspense>
  }
}
