import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import {
  complexityPredictionDrillSchema,
  lookalikeDrillSchema,
  patternsFileSchema,
  signalDrillSchema,
  signalItemSchema,
} from '../src/content/schema'
import { complexityAsCheck, signalAsCheck } from '../src/content/patterns'
import { isCorrect } from '../src/lib/answers'
import { drillCardId, parseCardId } from '../src/lib/scheduler'

const read = (p: string) => JSON.parse(readFileSync(p, 'utf8'))
const catalogue = patternsFileSchema.parse(read('content/patterns.json'))
const signal = signalDrillSchema.parse(read('content/drills/signal-spotting.json'))
const lookalikes = lookalikeDrillSchema.parse(read('content/drills/lookalikes.json'))
const complexity = complexityPredictionDrillSchema.parse(read('content/drills/complexity-prediction.json'))
const ids = new Set(catalogue.patterns.map((p) => p.id))

describe('pattern catalogue', () => {
  it('covers every pattern the brief lists', () => {
    expect([...ids].sort()).toEqual(
      [
        'backtracking', 'bfs', 'binary-search', 'dfs', 'dynamic-programming', 'fast-slow', 'graph-traversal', 'greedy',
        'hash-lookup', 'heap-top-k', 'intervals', 'prefix-sums', 'sliding-window', 'stack', 'tree-traversal', 'two-pointers',
      ].sort(),
    )
  })
  it('gives every pattern at least three examples and a confusion', () => {
    for (const p of catalogue.patterns) {
      expect(p.examples.length).toBeGreaterThanOrEqual(3)
      expect(p.confusions.length).toBeGreaterThanOrEqual(1)
    }
  })
})

describe('drills', () => {
  it('refer only to known patterns', () => {
    for (const it of signal.items) for (const r of [it.pattern, ...it.options]) expect(ids.has(r)).toBe(true)
    for (const it of lookalikes.items) for (const r of [it.a.pattern, it.b.pattern]) expect(ids.has(r)).toBe(true)
  })
  it('use every pattern as a signal-spotting answer at least once, bar a few', () => {
    const used = new Set(signal.items.map((i) => i.pattern))
    expect(used.size).toBeGreaterThanOrEqual(14)
  })
  it('reject a cue phrase that is not in the statement', () => {
    const bad = { ...signal.items[0]!, candidates: [{ phrase: 'not in here', cue: true }, { phrase: 'sorted', cue: false }] }
    expect(signalItemSchema.safeParse(bad).success).toBe(false)
  })
})

describe('drill items as review cards', () => {
  it('turn a signal item into a choice check whose answer is the right pattern', () => {
    for (const it of signal.items) {
      const check = signalAsCheck(it, catalogue.patterns)
      expect(check.kind).toBe('choice')
      if (check.kind !== 'choice') continue
      const name = catalogue.patterns.find((p) => p.id === it.pattern)!.name
      expect(check.options[check.answer]).toBe(name)
      expect(isCorrect(check, String(check.answer))).toBe(true)
    }
  })
  it('turn a complexity item into a choice check', () => {
    const check = complexityAsCheck(complexity.items[0]!)
    expect(check.kind === 'choice' && check.options[check.answer]).toBe('O(n log n)')
  })
  it('round-trips card ids', () => {
    expect(parseCardId(drillCardId('signal-spotting', 'sorted-pair'))).toEqual({ kind: 'drill', drill: 'signal-spotting', itemId: 'sorted-pair' })
    expect(parseCardId('dsa/big-o#index-lookup')).toEqual({ kind: 'check', moduleId: 'dsa', topicId: 'big-o', checkId: 'index-lookup' })
    expect(parseCardId('nonsense')).toBeUndefined()
  })
})
