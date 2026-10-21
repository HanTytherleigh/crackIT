import { describe, expect, it } from 'vitest'
import { callFrames, layoutTree } from '../src/widgets/callStack'

const last = (f: ReturnType<typeof callFrames>) => f.at(-1)!

describe('call frames', () => {
  it('computes factorial with depth n', () => {
    const f = callFrames('factorial', 4)
    expect(last(f).say).toContain('= 24')
    expect(Math.max(...f.map((x) => x.stack.length))).toBe(4)
  })

  it('makes 15 calls for naive fib(5), computing fib(2) three times', () => {
    const f = callFrames('fib', 5)
    expect(last(f).calls).toBe(15)
    expect(last(f).say).toContain('fib(5) = 5')
    expect(last(f).nodes.filter((n) => n.arg === 2)).toHaveLength(3)
    expect(last(f).nodes.filter((n) => n.repeat).length).toBeGreaterThan(0)
  })

  it('makes 2n − 1 calls with a memo', () => {
    for (const n of [3, 5, 6]) {
      const f = callFrames('fib', n, true)
      expect(last(f).calls).toBe(2 * n - 1)
    }
    expect(last(callFrames('fib', 6, true)).say).toContain('fib(6) = 8')
  })

  it('never lets the stack exceed n frames for fib', () => {
    const f = callFrames('fib', 6)
    expect(Math.max(...f.map((x) => x.stack.length))).toBe(6)
  })
})

describe('layoutTree', () => {
  it('centres parents over their children', () => {
    const x = layoutTree([
      { id: 0, parent: null },
      { id: 1, parent: 0 },
      { id: 2, parent: 0 },
    ])
    expect(x.get(1)).toBeCloseTo(0.25)
    expect(x.get(2)).toBeCloseTo(0.75)
    expect(x.get(0)).toBeCloseTo(0.5)
  })
})
