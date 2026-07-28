export const authQueryKeys = {
  all: ['auth'] as const,
  user: () => ['auth', 'user'] as const,
  accountSubject: () => ['auth', 'account-subject'] as const,
}

export const publicQueryKeys = {
  all: ['public'] as const,
  authPolicy: () => ['public', 'auth-policy'] as const,
  templates: () => ['public', 'templates'] as const,
  programSetupOptions: (templateId: string) =>
    ['public', 'templates', 'setup', templateId] as const,
}

export const accountQueryKeys = {
  all: ['account'] as const,
  user: (userId: string) => ['account', userId] as const,
  profile: (userId: string) => ['account', userId, 'profile'] as const,
  bodyweight: (userId: string) => ['account', userId, 'bodyweight'] as const,
  templatesRoot: (userId: string) => ['account', userId, 'templates'] as const,
  templates: (userId: string) => ['account', userId, 'templates', 'catalog'] as const,
  programSetupOptions: (userId: string, templateId: string) =>
    ['account', userId, 'templates', 'setup', templateId] as const,
  program: (userId: string) => ['account', userId, 'program'] as const,
  activeProgram: (userId: string) => ['account', userId, 'program', 'active'] as const,
  programOverview: (userId: string) => ['account', userId, 'program', 'overview'] as const,
  today: (userId: string) => ['account', userId, 'today'] as const,
  sessions: (userId: string) => ['account', userId, 'sessions'] as const,
  session: (userId: string, sessionId: string) =>
    ['account', userId, 'sessions', sessionId] as const,
  summaries: (userId: string) => ['account', userId, 'summaries'] as const,
  summary: (userId: string, sessionId: string) =>
    ['account', userId, 'summaries', sessionId] as const,
  movementSwapOptions: (userId: string, sessionId: string, exerciseLogId?: string) =>
    exerciseLogId
      ? ['account', userId, 'sessions', sessionId, 'movement-swap-options', exerciseLogId] as const
      : ['account', userId, 'sessions', sessionId, 'movement-swap-options'] as const,
  movementOptions: (userId: string) => ['account', userId, 'movement-options'] as const,
  accessoryMovementOptions: (userId: string) =>
    ['account', userId, 'movement-options', 'accessory'] as const,
  allMovementOptions: (userId: string) =>
    ['account', userId, 'movement-options', 'all'] as const,
  favoriteWorkouts: (userId: string) =>
    ['account', userId, 'favorite-workouts'] as const,
  history: (userId: string) => ['account', userId, 'history'] as const,
  recentHistory: (userId: string) => ['account', userId, 'history', 'recent'] as const,
  historyDashboard: (userId: string) =>
    ['account', userId, 'history', 'dashboard'] as const,
  todayHistorySupport: (userId: string) =>
    ['account', userId, 'history', 'today-support'] as const,
  movementHistory: (userId: string, movementId: string) =>
    ['account', userId, 'history', 'movement', movementId] as const,
}
