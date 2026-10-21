import { describe, expect, it } from 'vitest'
import { isCorrect, normalizeAnswer, parseNumber } from '../src/lib/answers'
import type { Check } from '../src/content/schema'

describe('normalizeAnswer', () => {
  it.each([
    ['O(n²)', 'n^2'],
    ['o(n^2)', 'n^2'],
    ['O(n * n)', 'n^2'],
    ['n**2', 'n^2'],
    ['Big O(n³)', 'n^3'],
    ['O(n*n*n)', 'n^3'],
    ['O(log n)', 'logn'],
    ['O(log(n))', 'logn'],
    ['O(log2 n)', 'logn'],
    ['O(n log n)', 'nlogn'],
    ['  O( N )  ', 'n'],
  ])('%s → %s', (raw, expected) => {
    expect(normalizeAnswer(raw)).toBe(expected)
  })
})

describe('parseNumber', () => {
  it('accepts commas and spaces', () => {
    expect(parseNumber('1,000,000')).toBe(1_000_000)
    expect(parseNumber(' 28 ')).toBe(28)
    expect(parseNumber('.75')).toBe(0.75)
  })
  it('rejects words', () => {
    expect(parseNumber('about 20')).toBeUndefined()
    expect(parseNumber('')).toBeUndefined()
  })
})

describe('isCorrect', () => {
  const base = { id: 'x', prompt: 'p', explanation: 'e', hints: [] }
  const text: Check = { ...base, kind: 'text', accept: ['O(n^2)'] }
  const num: Check = { ...base, kind: 'number', answer: 20, tolerance: 1 }
  const choice: Check = { ...base, kind: 'choice', options: ['a', 'b'], answer: 1 }

  it('matches equivalent spellings of text answers', () => {
    expect(isCorrect(text, 'O(n²)')).toBe(true)
    expect(isCorrect(text, 'n*n')).toBe(true)
    expect(isCorrect(text, 'O(n)')).toBe(false)
    expect(isCorrect(text, '')).toBe(false)
  })
  it('allows the tolerance on numbers', () => {
    expect(isCorrect(num, '21')).toBe(true)
    expect(isCorrect(num, '22')).toBe(false)
  })
  it('compares choice indexes', () => {
    expect(isCorrect(choice, '1')).toBe(true)
    expect(isCorrect(choice, '0')).toBe(false)
  })
})
