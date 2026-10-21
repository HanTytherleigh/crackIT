// Min-heap insert (sift up) and pop (sift down), recorded swap by swap.

import { marked } from './snippet'

export type HeapLine = 'append' | 'compare-up' | 'swap-up' | 'settled' | 'take-root' | 'move-last' | 'compare-down' | 'swap-down' | 'empty'

export interface HeapFrame {
  heap: number[]
  /** Indexes being compared or swapped. */
  active: number[]
  line: HeapLine
  say: string
  popped?: number
}

export const parent = (i: number) => Math.floor((i - 1) / 2)

export function pushFrames(start: number[], value: number): HeapFrame[] {
  const h = [...start, value]
  const frames: HeapFrame[] = []
  let i = h.length - 1
  frames.push({ heap: [...h], active: [i], line: 'append', say: `Add ${value} at the end of the array (index ${i}): the next free spot in the bottom row.` })
  while (i > 0) {
    const p = parent(i)
    frames.push({ heap: [...h], active: [i, p], line: 'compare-up', say: `Compare ${h[i]} with its parent ${h[p]} (index (${i} − 1) // 2 = ${p}).` })
    if (h[i]! >= h[p]!) break
    ;[h[i], h[p]] = [h[p]!, h[i]!]
    frames.push({ heap: [...h], active: [p, i], line: 'swap-up', say: `${h[p]} is smaller, so swap it up.` })
    i = p
  }
  frames.push({ heap: [...h], active: [i], line: 'settled', say: i === 0 ? `${h[0]} reached the root: it is the new minimum.` : `${h[i]} is not smaller than its parent: the heap property holds again. At most log n swaps.` })
  return frames
}

export function popFrames(start: number[]): HeapFrame[] {
  const h = [...start]
  const frames: HeapFrame[] = []
  if (h.length === 0) return [{ heap: [], active: [], line: 'empty', say: 'The heap is empty.' }]
  const min = h[0]!
  frames.push({ heap: [...h], active: [0], line: 'take-root', say: `The minimum is always at the root: ${min}. Take it.`, popped: min })
  const last = h.pop()!
  if (h.length === 0) {
    frames.push({ heap: [], active: [], line: 'settled', say: `That was the only item. The heap is now empty.`, popped: min })
    return frames
  }
  h[0] = last
  frames.push({ heap: [...h], active: [0], line: 'move-last', say: `Move the last item, ${last}, into the root's place. The tree stays complete, but the order may be broken.`, popped: min })
  let i = 0
  for (;;) {
    const l = 2 * i + 1
    const r = 2 * i + 2
    if (l >= h.length) break
    const child = r < h.length && h[r]! < h[l]! ? r : l
    frames.push({ heap: [...h], active: [i, child], line: 'compare-down', say: `Compare ${h[i]} with its smaller child, ${h[child]} (index ${child}).`, popped: min })
    if (h[i]! <= h[child]!) break
    ;[h[i], h[child]] = [h[child]!, h[i]!]
    frames.push({ heap: [...h], active: [child, i], line: 'swap-down', say: `${h[i]} is smaller, so swap ${h[child]} down.`, popped: min })
    i = child
  }
  const atLeaf = 2 * i + 1 >= h.length
  frames.push({
    heap: [...h],
    active: [i],
    line: 'settled',
    say: `${h[i]} ${atLeaf ? 'has reached a leaf' : 'is no bigger than its children'}: heap restored. Popped ${min} in O(log n).`,
    popped: min,
  })
  return frames
}

export function isMinHeap(h: number[]): boolean {
  return h.every((v, i) => i === 0 || h[parent(i)]! <= v)
}

export const heapSnippets = {
  push: marked<HeapLine>({
    ts: `
function push(heap: number[], value: number) {
  heap.push(value) @@append
  let i = heap.length - 1
  while (i > 0) {
    const p = Math.floor((i - 1) / 2) @@compare-up
    if (heap[i] >= heap[p]) break @@compare-up @@settled
    ;[heap[i], heap[p]] = [heap[p], heap[i]] @@swap-up
    i = p @@swap-up
  }
}`,
    py: `
def push(heap, value):
    heap.append(value) @@append
    i = len(heap) - 1
    while i > 0:
        p = (i - 1) // 2 @@compare-up
        if heap[i] >= heap[p]: @@compare-up @@settled
            break @@settled
        heap[i], heap[p] = heap[p], heap[i] @@swap-up
        i = p @@swap-up`,
  }),
  pop: marked<HeapLine>({
    ts: `
function pop(heap: number[]): number {
  const min = heap[0] @@take-root
  heap[0] = heap[heap.length - 1] @@move-last
  heap.pop() @@move-last
  let i = 0
  while (2 * i + 1 < heap.length) {
    let c = 2 * i + 1 // pick the smaller child @@compare-down
    if (c + 1 < heap.length && heap[c + 1] < heap[c]) c++ @@compare-down
    if (heap[i] <= heap[c]) break @@settled
    ;[heap[i], heap[c]] = [heap[c], heap[i]] @@swap-down
    i = c @@swap-down
  }
  return min
}`,
    py: `
def pop(heap):
    smallest = heap[0] @@take-root
    heap[0] = heap[-1] @@move-last
    heap.pop() @@move-last
    i = 0
    while 2 * i + 1 < len(heap):
        c = 2 * i + 1  # pick the smaller child @@compare-down
        if c + 1 < len(heap) and heap[c + 1] < heap[c]: @@compare-down
            c += 1 @@compare-down
        if heap[i] <= heap[c]: @@settled
            break @@settled
        heap[i], heap[c] = heap[c], heap[i] @@swap-down
        i = c @@swap-down
    return smallest`,
  }),
}
