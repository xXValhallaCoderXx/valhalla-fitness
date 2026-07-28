export type Unit = 'kg' | 'lb'

export type MovementRole = 'main' | 'variation' | 'accessory' | 'warmup' | 'event'

export type SessionHardness = 'Light' | 'Medium' | 'Hard' | 'Deload'

export type ProgramStateDefaults = Record<string, number | null>
