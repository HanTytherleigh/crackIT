import { describe, expect, it } from 'vitest'
import { isMinHeap, popFrames, pushFrames } from '../src/widgets/heap'

describe('min-heap frames', () => {
  it('keeps the heap property after every push and pops in sorted order', () => {
    let seed = 7
    const rand = () => (seed = (seed * 48271) % 2147483647) % 100
    let h: number[] = []
    const values = Array.from({ length: 15 }, rand)
    for (const v of values) {
      h = pushFrames(h, v).at(-1)!.heap
      expect(isMinHeap(h)).toBe(true)
    }
    const out: number[] = []
    while (h.length) {
      const last = popFrames(h).at(-1)!
      out.push(last.popped!)
      h = last.heap
      expect(isMinHeap(h)).toBe(true)
    }
    expect(out).toEqual([...values].sort((a, b) => a - b))
  })

  it('sifts a new minimum all the way up in log n swaps', () => {
    const start = [2, 5, 3, 9, 6, 8, 4]
    const frames = pushFrames(start, 1)
    expect(frames.at(-1)!.heap[0]).toBe(1)
    expect(frames.filter((f) => f.line === 'swap-up')).toHaveLength(3)
  })

  it('handles popping the only item', () => {
    const last = popFrames([4]).at(-1)!
    expect(last.popped).toBe(4)
    expect(last.heap).toEqual([])
  })
})
