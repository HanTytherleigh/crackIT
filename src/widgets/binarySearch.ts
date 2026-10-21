// Precomputes every step of a binary search so the widget can move forward and back freely.

export type BsLine = 'init' | 'loop' | 'mid' | 'found' | 'go-right' | 'go-left' | 'not-found'

export interface BsFrame {
  lo: number
  hi: number
  mid?: number
  line: BsLine
  /** Indexes still in play; everything else has been thrown away. */
  say: string
  done: boolean
  foundAt?: number
}

export function binarySearchFrames(values: number[], target: number): BsFrame[] {
  const frames: BsFrame[] = []
  let lo = 0
  let hi = values.length - 1
  frames.push({ lo, hi, line: 'init', done: false, say: `Start with the whole list: lo = ${lo}, hi = ${hi}.` })
  while (lo <= hi) {
    frames.push({ lo, hi, line: 'loop', done: false, say: `lo ≤ hi, so ${hi - lo + 1} ${hi - lo === 0 ? 'item is' : 'items are'} still in play.` })
    const mid = Math.floor((lo + hi) / 2)
    frames.push({ lo, hi, mid, line: 'mid', done: false, say: `Check the middle: index ${mid}, value ${values[mid]}.` })
    if (values[mid] === target) {
      frames.push({ lo, hi, mid, line: 'found', done: true, foundAt: mid, say: `${values[mid]} is the target. Found at index ${mid}.` })
      return frames
    }
    if (values[mid]! < target) {
      frames.push({ lo, hi, mid, line: 'go-right', done: false, say: `${values[mid]} < ${target}, so the target can only be to the right. Throw away the left half.` })
      lo = mid + 1
    } else {
      frames.push({ lo, hi, mid, line: 'go-left', done: false, say: `${values[mid]} > ${target}, so the target can only be to the left. Throw away the right half.` })
      hi = mid - 1
    }
  }
  frames.push({ lo, hi, line: 'not-found', done: true, say: `lo > hi: nothing left to check, so ${target} is reported as not found.` })
  return frames
}

/** Line numbers of each step in the TypeScript and Python snippets below (1-based). */
export const bsLines: Record<'ts' | 'py', Record<BsLine, number[]>> = {
  ts: { init: [2, 3], loop: [4], mid: [5], found: [6], 'go-right': [7], 'go-left': [8], 'not-found': [10] },
  py: { init: [2], loop: [3], mid: [4], found: [5, 6], 'go-right': [7, 8], 'go-left': [9, 10], 'not-found': [11] },
}

export const bsSnippet = {
  ts: `function binarySearch(sorted: number[], target: number): number {
  let lo = 0
  let hi = sorted.length - 1
  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2)
    if (sorted[mid] === target) return mid
    if (sorted[mid] < target) lo = mid + 1
    else hi = mid - 1
  }
  return -1
}`,
  py: `def binary_search(sorted_list, target):
    lo, hi = 0, len(sorted_list) - 1
    while lo <= hi:
        mid = (lo + hi) // 2
        if sorted_list[mid] == target:
            return mid
        if sorted_list[mid] < target:
            lo = mid + 1
        else:
            hi = mid - 1
    return -1`,
}

/** Worst-case guesses for 1..n with halving: the number of halvings to reach one candidate. */
export function maxGuesses(n: number): number {
  return Math.ceil(Math.log2(n + 1))
}
