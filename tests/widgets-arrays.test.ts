import { describe, expect, it } from 'vitest'
import { arrayOpFrames, arraySnippets } from '../src/widgets/arrayOps'
import { pairSnippet, pairSumFrames, slidingWindowFrames, windowSnippet } from '../src/widgets/twoPointers'
import { marked } from '../src/widgets/snippet'

describe('marked snippets', () => {
  it('strips markers and records their lines', () => {
    const s = marked<'a' | 'b'>({ ts: '\nx = 1 @@a\ny = 2\nz = 3 @@a @@b\n', py: 'p @@b' })
    expect(s.snippet.ts).toBe('x = 1\ny = 2\nz = 3')
    expect(s.lines.ts).toEqual({ a: [1, 3], b: [3] })
    expect(s.snippet.py).toBe('p')
    expect(s.lines.py).toEqual({ b: [1] })
  })
  it('leaves no marker text in the real snippets', () => {
    const all = [...Object.values(arraySnippets), pairSnippet, windowSnippet]
    for (const s of all) expect(s.snippet.ts + s.snippet.py).not.toContain('@@')
  })
})

describe('arrayOpFrames', () => {
  const start = [3, 7, 1, 9, 4, null, null, null]

  it('shifts n − i items to insert at index i', () => {
    const f = arrayOpFrames(start, 5, { kind: 'insert', index: 1, value: 8 })
    const last = f.at(-1)!
    expect(last.cells).toEqual([3, 8, 7, 1, 9, 4, null, null])
    expect(last.length).toBe(6)
    expect(last.moves).toBe(4)
  })

  it('shifts the items after i to delete at index i', () => {
    const last = arrayOpFrames(start, 5, { kind: 'delete', index: 0 }).at(-1)!
    expect(last.cells).toEqual([7, 1, 9, 4, null, null, null, null])
    expect(last.length).toBe(4)
    expect(last.moves).toBe(4)
  })

  it('appends with no moves when there is room', () => {
    const last = arrayOpFrames(start, 5, { kind: 'append', value: 2 }).at(-1)!
    expect(last.moves).toBe(0)
    expect(last.cells[5]).toBe(2)
  })

  it('doubles and copies when full', () => {
    const full = [1, 2, 3, 4]
    const f = arrayOpFrames(full, 4, { kind: 'append', value: 5 })
    const last = f.at(-1)!
    expect(last.cells).toEqual([1, 2, 3, 4, 5, null, null, null])
    expect(last.moves).toBe(4)
    expect(f.some((x) => x.resized)).toBe(true)
  })

  it('reads in one frame with no moves', () => {
    const f = arrayOpFrames(start, 5, { kind: 'read', index: 3 })
    expect(f).toHaveLength(1)
    expect(f[0]!.moves).toBe(0)
  })
})

describe('two pointers', () => {
  const sorted = [1, 2, 4, 6, 8, 9, 11, 14]

  it('finds a pair in at most n − 1 checks', () => {
    const last = pairSumFrames(sorted, 15).at(-1)!
    expect(last.found).toBe(true)
    expect(sorted[last.left]! + sorted[last.right]!).toBe(15)
    expect(last.checks).toBeLessThanOrEqual(sorted.length - 1)
  })

  it('reports when there is no pair', () => {
    const last = pairSumFrames(sorted, 4).at(-1)!
    expect(last.line).toBe('none')
  })

  it('agrees with brute force for every target', () => {
    for (let t = 0; t <= 30; t++) {
      let brute = false
      for (let i = 0; i < sorted.length; i++) for (let j = i + 1; j < sorted.length; j++) if (sorted[i]! + sorted[j]! === t) brute = true
      expect(pairSumFrames(sorted, t).at(-1)!.line === 'found').toBe(brute)
    }
  })
})

describe('sliding window', () => {
  it('finds the best window sum', () => {
    const last = slidingWindowFrames([2, 1, 5, 1, 3, 2], 3).at(-1)!
    expect(last.best).toBe(9)
    expect(last.bestStart).toBe(2)
  })
  it('agrees with summing every window from scratch', () => {
    const values = [2, 1, 5, 1, 3, 2, 6, 1]
    for (let k = 1; k <= values.length; k++) {
      let brute = -Infinity
      for (let s = 0; s + k <= values.length; s++) brute = Math.max(brute, values.slice(s, s + k).reduce((a, b) => a + b, 0))
      expect(slidingWindowFrames(values, k).at(-1)!.best).toBe(brute)
    }
  })
})
