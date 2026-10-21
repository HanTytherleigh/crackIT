// A small Leitner scheduler. Cards move up a box when answered well and back to box 1
// when missed. Each box waits longer before the card comes back. Dates are whole local days.

import type { ReviewCard } from './progressModel'

/** Days to wait after landing in each box (index = box). Box 0 is unused. */
export const BOX_INTERVAL_DAYS = [0, 1, 2, 4, 8, 16, 32] as const
export const MAX_BOX = BOX_INTERVAL_DAYS.length - 1
/** At most this many cards per review session, to keep sessions short. */
export const SESSION_LIMIT = 20

/** good: right first time with no hints. hard: right, but needed hints. again: wrong or revealed. */
export type Grade = 'good' | 'hard' | 'again'

export function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

export function addDays(d: Date, days: number): Date {
  const out = startOfDay(d)
  out.setDate(out.getDate() + days)
  return out
}

/** A new card waits until tomorrow: re-checking straight away would only test short-term memory. */
export function newCard(id: string, now: Date): ReviewCard {
  return { id, box: 1, due: addDays(now, 1).toISOString(), reviews: 0, lapses: 0 }
}

export function reviewCard(card: ReviewCard, grade: Grade, now: Date): ReviewCard {
  const box = grade === 'good' ? Math.min(MAX_BOX, card.box + 1) : grade === 'hard' ? card.box : 1
  return {
    ...card,
    box,
    due: addDays(now, BOX_INTERVAL_DAYS[box]!).toISOString(),
    reviews: card.reviews + 1,
    lapses: card.lapses + (grade === 'again' ? 1 : 0),
    lastReviewedAt: now.toISOString(),
  }
}

export function isDue(card: ReviewCard, now: Date): boolean {
  return Date.parse(card.due) <= now.getTime()
}

export function dueCards(cards: Record<string, ReviewCard>, now: Date): ReviewCard[] {
  return Object.values(cards)
    .filter((c) => isDue(c, now))
    .sort((a, b) => Date.parse(a.due) - Date.parse(b.due) || a.box - b.box)
}

/** The next day anything is due, and how many cards fall due that day. */
export function nextDue(cards: Record<string, ReviewCard>, now: Date): { date: Date; count: number } | undefined {
  const upcoming = Object.values(cards).filter((c) => !isDue(c, now))
  if (upcoming.length === 0) return undefined
  const first = Math.min(...upcoming.map((c) => Date.parse(startOfDay(new Date(c.due)).toISOString())))
  const count = upcoming.filter((c) => startOfDay(new Date(c.due)).getTime() === first).length
  return { date: new Date(first), count }
}

/**
 * Interleaves cards so consecutive questions come from different topics where possible.
 * Mixing topics is harder than blocking them, and that is what makes it stick.
 */
export function interleave<T>(items: T[], groupOf: (t: T) => string, random: () => number = Math.random): T[] {
  const groups = new Map<string, T[]>()
  for (const it of items) {
    const g = groupOf(it)
    groups.set(g, [...(groups.get(g) ?? []), it])
  }
  for (const list of groups.values()) shuffle(list, random)
  const out: T[] = []
  let last: string | undefined
  while (out.length < items.length) {
    const candidates = [...groups.entries()].filter(([g, l]) => l.length > 0 && g !== last)
    const pool = candidates.length > 0 ? candidates : [...groups.entries()].filter(([, l]) => l.length > 0)
    // Take from the largest remaining group, so no topic piles up at the end.
    pool.sort((a, b) => b[1].length - a[1].length)
    const [g, list] = pool[0]!
    out.push(list.shift()!)
    last = g
  }
  return out
}

function shuffle<T>(arr: T[], random: () => number) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j]!, arr[i]!]
  }
}

// Card ids ------------------------------------------------------------------

export function checkCardId(moduleId: string, topicId: string, checkId: string): string {
  return `${moduleId}/${topicId}#${checkId}`
}

export function parseCheckCardId(id: string): { moduleId: string; topicId: string; checkId: string } | undefined {
  const m = id.match(/^([a-z0-9-]+)\/([a-z0-9-]+)#([a-z0-9-]+)$/)
  return m ? { moduleId: m[1]!, topicId: m[2]!, checkId: m[3]! } : undefined
}
