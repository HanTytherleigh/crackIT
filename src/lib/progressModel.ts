// The shape of saved progress, its migrations, and the mastery rules.
// Kept free of Zod so it can live in the main bundle; the import path validates
// with src/lib/progressSchema.ts, which is loaded on demand.

export const PROGRESS_SCHEMA_VERSION = 1

export const lessonStages = ['recall', 'learn', 'explain', 'checks', 'hands-on', 'wrap-up'] as const
export type LessonStage = (typeof lessonStages)[number]

export interface CheckRecord {
  attempts: number
  lastAnswer: string
  correct: boolean
  /** Set when answered correctly before the answer was revealed. */
  passedAt?: string
  revealed: boolean
}

export interface ExplainBackRecord {
  text: string
  covered: string[]
  submittedAt: string
}

export interface HandsOnRecord {
  attempt: string
  triedAt?: string
  hintsShown: number
  revealed: boolean
  selfCheck: number[]
}

export interface TopicProgress {
  startedAt: string
  updatedAt: string
  /** Furthest lesson stage reached; earlier stages can be revisited. */
  furthestStage: LessonStage
  recall: Record<string, string>
  checks: Record<string, CheckRecord>
  checkHints: Record<string, number>
  explainBack?: ExplainBackRecord
  handsOn?: HandsOnRecord
  /** Set by the lesson once enough checks are passed. */
  checksPassedAt?: string
  /** Set by the lesson once the explain-back rubric reaches its pass mark. */
  explainBackPassedAt?: string
  /** Set by the review queue once the delayed re-check is passed. */
  recheckPassedAt?: string
}

/** A spaced-repetition card, scheduled by src/lib/scheduler.ts. */
export interface ReviewCard {
  id: string
  box: number
  due: string
  reviews: number
  lapses: number
  lastReviewedAt?: string
}

export interface ProgressData {
  schemaVersion: typeof PROGRESS_SCHEMA_VERSION
  topics: Record<string, TopicProgress>
  review: { cards: Record<string, ReviewCard> }
  lastLesson?: { moduleId: string; topicId: string }
  lastExportedAt?: string
}

export function emptyProgress(): ProgressData {
  return { schemaVersion: PROGRESS_SCHEMA_VERSION, topics: {}, review: { cards: {} } }
}

export function topicKey(moduleId: string, topicId: string): string {
  return `${moduleId}/${topicId}`
}

// ---------------------------------------------------------------------------
// Migrations. Each entry upgrades data from version `from` to `from + 1`.
// Add one whenever ProgressData changes shape, then bump PROGRESS_SCHEMA_VERSION.

const migrations: Record<number, (data: Record<string, unknown>) => Record<string, unknown>> = {}

export class ProgressVersionError extends Error {}

/** Upgrades saved progress of any older version to the current one. */
export function migrateProgress(data: unknown): unknown {
  if (typeof data !== 'object' || data === null) return data
  let current = data as Record<string, unknown>
  let version = typeof current.schemaVersion === 'number' ? current.schemaVersion : 0
  if (version > PROGRESS_SCHEMA_VERSION)
    throw new ProgressVersionError(`This file is from a newer version of crackIT (progress v${version}). Update the app and try again.`)
  while (version < PROGRESS_SCHEMA_VERSION) {
    const step = migrations[version]
    if (!step) throw new ProgressVersionError(`No migration from progress v${version}.`)
    current = { ...step(current), schemaVersion: version + 1 }
    version++
  }
  return current
}

// ---------------------------------------------------------------------------
// Mastery. A topic is solid only after its checks, the explain-back rubric,
// and a delayed re-check. Viewing a lesson never counts.

export type Mastery = 'new' | 'learning' | 'awaiting-recheck' | 'solid'

export const masteryLabel: Record<Mastery, string> = {
  new: 'Not started',
  learning: 'Learning',
  'awaiting-recheck': 'Re-check due later',
  solid: 'Solid',
}

/** Share of a topic's checks that must be passed without revealing the answer. */
export const CHECK_PASS_SHARE = 0.8

export function checksPassMark(totalChecks: number): number {
  return Math.ceil(totalChecks * CHECK_PASS_SHARE)
}

/** A delayed re-check has to happen at least this long after the lesson's checks were passed. */
export const RECHECK_DELAY_MS = 20 * 60 * 60 * 1000

/**
 * The delayed re-check is passed once enough of the topic's review cards have been answered
 * well (box 2 or higher) in a review held a day or so after the lesson's checks were passed.
 */
export function recheckPassed(
  p: TopicProgress | undefined,
  topicCards: ReviewCard[],
  totalChecks: number,
): boolean {
  if (!p?.checksPassedAt) return false
  const earliest = Date.parse(p.checksPassedAt) + RECHECK_DELAY_MS
  const good = topicCards.filter((c) => c.box >= 2 && c.lastReviewedAt && Date.parse(c.lastReviewedAt) >= earliest)
  return good.length >= checksPassMark(totalChecks)
}

export function masteryOf(p: TopicProgress | undefined): Mastery {
  if (!p) return 'new'
  if (p.checksPassedAt && p.explainBackPassedAt) return p.recheckPassedAt ? 'solid' : 'awaiting-recheck'
  return 'learning'
}
