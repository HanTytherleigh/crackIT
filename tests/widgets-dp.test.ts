import { describe, expect, it } from 'vitest'
import { fibFrames, knapsackFrames, KNAPSACK_CAPACITY, KNAPSACK_ITEMS, LCS_A, LCS_B, lcsFrames } from '../src/widgets/dpTable'

const isSubsequence = (s: string, of: string) => {
  let i = 0
  for (const ch of of) if (ch === s[i]) i++
  return i === s.length
}

describe('DP tables', () => {
  it('fills Fibonacci', () => {
    expect(fibFrames(10).at(-1)!.table[0]![10]).toBe(55)
  })

  it('solves the knapsack and agrees with brute force', () => {
    let best = 0
    for (let mask = 0; mask < 1 << KNAPSACK_ITEMS.length; mask++) {
      const chosen = KNAPSACK_ITEMS.filter((_, i) => mask & (1 << i))
      const w = chosen.reduce((s, x) => s + x.w, 0)
      if (w <= KNAPSACK_CAPACITY) best = Math.max(best, chosen.reduce((s, x) => s + x.v, 0))
    }
    const last = knapsackFrames().at(-1)!
    expect(last.table[KNAPSACK_ITEMS.length]![KNAPSACK_CAPACITY]).toBe(best)
    expect(best).toBe(9)
    expect(last.say).toContain('items 2 and 3')
  })

  it('finds a longest common subsequence', () => {
    const last = lcsFrames().at(-1)!
    expect(last.table[LCS_A.length]![LCS_B.length]).toBe(4)
    const found = last.say.match(/"([A-Z]+)"/)![1]!
    expect(found).toHaveLength(4)
    expect(isSubsequence(found, LCS_A) && isSubsequence(found, LCS_B)).toBe(true)
  })

  it('only ever reads cells that are already filled', () => {
    for (const frames of [fibFrames(), knapsackFrames(), lcsFrames()]) {
      for (const f of frames) for (const [r, c] of f.deps) expect(f.table[r]![c]).not.toBeNull()
    }
  })
})
