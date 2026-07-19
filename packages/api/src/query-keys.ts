export const queryKeys = {
  me: ['me'] as const,
  today: ['today'] as const,
  session: (sessionId: string) => ['session', sessionId] as const,
}
