import { describe, expect, it } from 'vitest'
import { binarySearchFrames, maxGuesses } from '../src/widgets/binarySearch'
import { complexityModelIds, countSteps, trace } from '../src/widgets/complexityModels'

describe('binarySearchFrames', () => {
  const sorted = [2, 5, 8, 12, 16, 23, 38, 45, 56, 67, 72, 78, 84, 91, 95, 99]

  it('finds every value, in at most log2(n) + 1 middle checks', () => {
    sorted.forEach((v, idx) => {
      const frames = binarySearchFrames(sorted, v)
      const last = frames.at(-1)!
      expect(last.line).toBe('found')
      expect(last.foundAt).toBe(idx)
      expect(frames.filter((f) => f.line === 'mid').length).toBeLessThanOrEqual(5)
    })
  })

  it('reports missing values as not found', () => {
    expect(binarySearchFrames(sorted, 50).at(-1)!.line).toBe('not-found')
  })

  it('can miss a present value when the data is not sorted', () => {
    const unsorted = [45, 2, 99, 16, 5, 72, 8, 91]
    expect(binarySearchFrames(unsorted, 45).at(-1)!.line).toBe('not-found')
  })

  it('needs about 20 guesses for a million and 30 for a billion', () => {
    expect(maxGuesses(100)).toBe(7)
    expect(maxGuesses(1_000_000)).toBe(20)
    expect(maxGuesses(1_000_000_000)).toBe(30)
  })
})

describe('complexity models', () => {
  const counts = (m: (typeof complexityModelIds)[number], k?: number) => [4, 8, 16].map((n) => countSteps(m, n, { k }))

  it('give the triangular trace 6, 28, 120', () => {
    expect(counts('triangular')).toEqual([6, 28, 120])
    expect(counts('unique-pairs')).toEqual([6, 28, 120])
  })
  it('add sequential loops and multiply nested ones', () => {
    expect(counts('sequential')).toEqual([8, 16, 32])
    expect(counts('nested')).toEqual([16, 64, 256])
    expect(counts('loop-then-nested')).toEqual([20, 72, 272])
    expect(counts('triple')).toEqual([64, 512, 4096])
  })
  it('handle fixed inner loops, halving and n log n', () => {
    expect(counts('fixed-inner', 5)).toEqual([20, 40, 80])
    expect(counts('halving')).toEqual([2, 3, 4])
    expect(counts('n-log-n')).toEqual([8, 24, 64])
    expect(counts('single')).toEqual([4, 8, 16])
  })
  it('trace ends with the same count', () => {
    for (const m of complexityModelIds) expect(trace(m, 4, { k: 5 }).at(-1)?.count ?? 0).toBe(countSteps(m, 4, { k: 5 }))
  })
})
