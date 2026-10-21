import { describe, expect, it } from 'vitest'
import { bracketFrames, dequeue, emptyQueue, enqueue, queueValues } from '../src/widgets/stackQueue'

describe('bracket matching', () => {
  const verdict = (s: string) => bracketFrames(s).at(-1)!.verdict
  it.each([
    ['([]{})', true],
    ['{[()()]}', true],
    ['', true],
    ['([)]', false],
    ['((()', false],
    ['())', false],
    [']', false],
  ])('%s → %s', (s, ok) => expect(verdict(s)).toBe(ok))
})

describe('ring buffer queue', () => {
  it('is first in, first out, and wraps around', () => {
    let q = emptyQueue(4)
    for (const v of [1, 2, 3]) q = enqueue(q, v).queue
    let r = dequeue(q)
    expect(r.value).toBe(1)
    q = r.queue
    r = dequeue(q)
    expect(r.value).toBe(2)
    q = r.queue
    for (const v of [4, 5, 6]) q = enqueue(q, v).queue // wraps past the end
    expect(queueValues(q)).toEqual([3, 4, 5, 6])
    expect(enqueue(q, 7).ok).toBe(false)
    expect(q.head).toBe(2)
  })
  it('dequeue on empty returns null', () => {
    expect(dequeue(emptyQueue()).value).toBeNull()
  })
})
