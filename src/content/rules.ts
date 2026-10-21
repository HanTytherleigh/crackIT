import type { Topic } from './schema'

// Runtime rules derived from content. Kept apart from schema.ts so Zod stays out of the main bundle.

/** Rubric points needed to pass an explain-back. Defaults to two thirds, rounded up. */
export function explainBackPassMark(t: Pick<Topic, 'explainBack'>): number {
  return t.explainBack.passMark ?? Math.ceil((t.explainBack.rubric.length * 2) / 3)
}
