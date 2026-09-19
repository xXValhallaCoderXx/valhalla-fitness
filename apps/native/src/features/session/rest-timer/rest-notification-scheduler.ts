/** Own one alarm, including schedules that resolve after cancellation or replacement. */
export function createRestNotificationScheduler(
  schedule: (endsAt: number, label: string | null) => Promise<string | null>,
  cancel: (id: string | null) => Promise<void>,
) {
  let generation = 0
  let notificationId: string | null = null
  const clear = () => {
    generation += 1
    const previous = notificationId
    notificationId = null
    void cancel(previous)
  }
  return {
    clear,
    replace: (endsAt: number, label: string | null) => {
      clear()
      const current = generation
      void schedule(endsAt, label).then((id) => {
        if (current !== generation) void cancel(id)
        else notificationId = id
      })
    },
  }
}
