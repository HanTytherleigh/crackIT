// Stack, circular-buffer queue, and bracket-matching frames.

import { marked } from './snippet'

export interface RingQueue {
  slots: (number | null)[]
  head: number
  size: number
}

export const emptyQueue = (capacity = 8): RingQueue => ({ slots: Array(capacity).fill(null), head: 0, size: 0 })
export const tailIndex = (q: RingQueue) => (q.head + q.size) % q.slots.length

export function enqueue(q: RingQueue, value: number): { queue: RingQueue; ok: boolean; at: number } {
  const at = tailIndex(q)
  if (q.size === q.slots.length) return { queue: q, ok: false, at }
  const slots = [...q.slots]
  slots[at] = value
  return { queue: { ...q, slots, size: q.size + 1 }, ok: true, at }
}

export function dequeue(q: RingQueue): { queue: RingQueue; value: number | null; at: number } {
  if (q.size === 0) return { queue: q, value: null, at: q.head }
  const slots = [...q.slots]
  const value = slots[q.head]!
  slots[q.head] = null
  return { queue: { slots, head: (q.head + 1) % q.slots.length, size: q.size - 1 }, value, at: q.head }
}

export function queueValues(q: RingQueue): number[] {
  return Array.from({ length: q.size }, (_, i) => q.slots[(q.head + i) % q.slots.length]!)
}

// Bracket matching -----------------------------------------------------------

const PAIRS: Record<string, string> = { ')': '(', ']': '[', '}': '{' }
export type BracketLine = 'push' | 'pop' | 'mismatch' | 'empty-close' | 'valid' | 'leftover'

export interface BracketFrame {
  index: number
  stack: string[]
  line: BracketLine
  say: string
  verdict?: boolean
}

export function bracketFrames(s: string): BracketFrame[] {
  const frames: BracketFrame[] = []
  const stack: string[] = []
  for (let i = 0; i < s.length; i++) {
    const ch = s[i]!
    if (!(ch in PAIRS)) {
      stack.push(ch)
      frames.push({ index: i, stack: [...stack], line: 'push', say: `"${ch}" opens something: push it. It must be closed before anything opened earlier.` })
      continue
    }
    const want = PAIRS[ch]!
    if (stack.length === 0) {
      frames.push({ index: i, stack: [], line: 'empty-close', verdict: false, say: `"${ch}" closes, but nothing is open. Invalid.` })
      return frames
    }
    const top = stack.pop()!
    if (top !== want) {
      frames.push({ index: i, stack: [...stack, top], line: 'mismatch', verdict: false, say: `"${ch}" should close "${want}", but the most recent opener is "${top}". Invalid.` })
      return frames
    }
    frames.push({ index: i, stack: [...stack], line: 'pop', say: `"${ch}" matches the top, "${top}". Pop it.` })
  }
  if (stack.length) {
    frames.push({ index: s.length, stack: [...stack], line: 'leftover', verdict: false, say: `End of input with ${stack.length} still open. Invalid.` })
  } else {
    frames.push({ index: s.length, stack: [], line: 'valid', verdict: true, say: 'End of input and the stack is empty: every bracket was closed in order. Valid.' })
  }
  return frames
}

export const bracketSnippet = marked<BracketLine>({
  ts: `
function isValid(s: string): boolean {
  const pairs: Record<string, string> = { ')': '(', ']': '[', '}': '{' }
  const stack: string[] = []
  for (const ch of s) {
    if (!(ch in pairs)) stack.push(ch) @@push
    else if (stack.pop() !== pairs[ch]) return false @@pop @@mismatch @@empty-close
  }
  return stack.length === 0 @@valid @@leftover
}`,
  py: `
def is_valid(s):
    pairs = {')': '(', ']': '[', '}': '{'}
    stack = []
    for ch in s:
        if ch not in pairs:
            stack.append(ch) @@push
        elif not stack or stack.pop() != pairs[ch]: @@pop @@mismatch @@empty-close
            return False @@mismatch @@empty-close
    return not stack @@valid @@leftover`,
})

export type SQLine = 'push' | 'pop' | 'enqueue' | 'dequeue'

export const stackSnippet = marked<SQLine>({
  ts: `
const stack: number[] = []
stack.push(x) // add to the top: O(1) @@push
const top = stack.pop() // take from the top: O(1) @@pop`,
  py: `
stack = []
stack.append(x)  # add to the top: O(1) @@push
top = stack.pop()  # take from the top: O(1) @@pop`,
})

export const queueSnippet = marked<SQLine>({
  ts: `
// A ring buffer: head and size, indexes wrap around
function enqueue(x: number) {
  slots[(head + size) % slots.length] = x @@enqueue
  size++ @@enqueue
}
function dequeue(): number {
  const x = slots[head] @@dequeue
  head = (head + 1) % slots.length @@dequeue
  size-- @@dequeue
  return x
}`,
  py: `
from collections import deque
queue = deque()
queue.append(x)       # enqueue at the back: O(1) @@enqueue
x = queue.popleft()   # dequeue from the front: O(1) @@dequeue
# Avoid list.pop(0): it shifts every item, O(n)`,
})
