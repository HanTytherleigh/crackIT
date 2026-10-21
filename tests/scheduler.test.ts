import { beforeEach, describe, expect, it } from 'vitest'
import {
  addDays,
  checkCardId,
  dueCards,
  interleave,
  nextDue,
  newCard,
  parseCheckCardId,
  reviewCard,
} from '../src/lib/scheduler'
import { masteryOf, recheckPassed, type ReviewCard } from '../src/lib/progressModel'
import { useProgress } from '../src/state/progress'

const day = (d: number, h = 10) => new Date(2026, 0, d, h)

describe('Leitner scheduling', () => {
  it('makes new cards due at the start of tomorrow', () => {
    const c = newCard('x', day(5, 22))
    expect(new Date(c.due)).toEqual(new Date(2026, 0, 6))
    expect(c.box).toBe(1)
  })

  it('moves up a box on good, waiting longer each time', () => {
    let c = newCard('x', day(1))
    const waits: number[] = []
    let now = day(2)
    for (let i = 0; i < 6; i++) {
      c = reviewCard(c, 'good', now)
      const due = new Date(c.due)
      waits.push(Math.round((due.getTime() - addDays(now, 0).getTime()) / 86_400_000))
      now = new Date(due.getTime() + 3_600_000)
    }
    expect(waits).toEqual([2, 4, 8, 16, 32, 32])
    expect(c.box).toBe(6)
  })

  it('keeps the box on hard and resets to box 1 on again', () => {
    let c = reviewCard(newCard('x', day(1)), 'good', day(2)) // box 2
    c = reviewCard(c, 'hard', day(4))
    expect(c.box).toBe(2)
    c = reviewCard(c, 'again', day(6))
    expect(c.box).toBe(1)
    expect(c.lapses).toBe(1)
    expect(c.reviews).toBe(3)
    expect(new Date(c.due)).toEqual(new Date(2026, 0, 7))
  })

  it('lists due cards and the next due day', () => {
    const cards: Record<string, ReviewCard> = {
      a: newCard('a', day(1)), // due 2nd
      b: newCard('b', day(3)), // due 4th
      c: newCard('c', day(3)), // due 4th
    }
    expect(dueCards(cards, day(2)).map((c) => c.id)).toEqual(['a'])
    expect(nextDue(cards, day(2))).toEqual({ date: new Date(2026, 0, 4), count: 2 })
    expect(nextDue({}, day(2))).toBeUndefined()
  })
})

describe('interleave', () => {
  it('avoids two cards from the same topic in a row when it can', () => {
    const items = ['a1', 'a2', 'a3', 'b1', 'b2', 'c1']
    let seed = 1
    const random = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
    const out = interleave(items, (s) => s[0]!, random)
    expect([...out].sort()).toEqual([...items].sort())
    for (let i = 1; i < out.length; i++) expect(out[i]![0]).not.toBe(out[i - 1]![0])
  })
})

describe('card ids', () => {
  it('round-trips', () => {
    const id = checkCardId('dsa', 'big-o', 'index-lookup')
    expect(id).toBe('dsa/big-o#index-lookup')
    expect(parseCheckCardId(id)).toEqual({ moduleId: 'dsa', topicId: 'big-o', checkId: 'index-lookup' })
    expect(parseCheckCardId('nonsense')).toBeUndefined()
  })
})

describe('delayed re-check', () => {
  const ref = { moduleId: 'dsa', topicId: 'big-o' }
  beforeEach(() => useProgress.getState().resetAll())

  it('creates one review card per attempted check, due tomorrow', () => {
    const s = useProgress.getState()
    s.recordCheck(ref, 'a', 'x', false, day(1))
    s.recordCheck(ref, 'a', 'y', true, day(1))
    s.recordCheck(ref, 'b', 'y', true, day(1))
    const cards = useProgress.getState().review.cards
    expect(Object.keys(cards).sort()).toEqual(['dsa/big-o#a', 'dsa/big-o#b'])
    expect(dueCards(cards, day(1, 23))).toHaveLength(0)
    expect(dueCards(cards, day(2, 0))).toHaveLength(2)
  })

  it('needs good reviews a day after the checks were passed', () => {
    const s = useProgress.getState()
    for (const id of ['a', 'b', 'c', 'd', 'e']) s.recordCheck(ref, id, 'ok', true, day(1))
    s.markChecksPassed(ref, day(1))
    s.saveExplainBack(ref, { text: 't', covered: ['x'] }, true, day(1))
    const cardsFor = () => Object.values(useProgress.getState().review.cards)
    const topic = () => useProgress.getState().topics['dsa/big-o']

    // Same-day reviews don't count, even if answered well.
    for (const id of ['a', 'b', 'c', 'd']) s.recordReview(`dsa/big-o#${id}`, 'good', day(1, 11))
    expect(recheckPassed(topic(), cardsFor(), 5)).toBe(false)

    // Next day: 4 of 5 answered well is the 80% pass mark.
    useProgress.getState().resetAll()
    for (const id of ['a', 'b', 'c', 'd', 'e']) s.recordCheck(ref, id, 'ok', true, day(1))
    s.markChecksPassed(ref, day(1))
    for (const id of ['a', 'b', 'c']) s.recordReview(`dsa/big-o#${id}`, 'good', day(2, 9))
    s.recordReview('dsa/big-o#d', 'again', day(2, 9))
    expect(recheckPassed(topic(), cardsFor(), 5)).toBe(false)
    s.recordReview('dsa/big-o#e', 'good', day(2, 9))
    expect(recheckPassed(topic(), cardsFor(), 5)).toBe(true)

    s.saveExplainBack(ref, { text: 't', covered: ['x'] }, true, day(2))
    s.markRecheckPassed(ref, day(2))
    expect(masteryOf(topic())).toBe('solid')
  })
})
