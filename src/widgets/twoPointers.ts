// Frames for the two pointers and sliding window stepper.

import { marked } from './snippet'

export type PairLine = 'init' | 'loop' | 'sum' | 'found' | 'move-left' | 'move-right' | 'none'

export interface PairFrame {
  left: number
  right: number
  sum?: number
  line: PairLine
  say: string
  checks: number
  found?: boolean
}

export function pairSumFrames(sorted: number[], target: number): PairFrame[] {
  const frames: PairFrame[] = []
  let left = 0
  let right = sorted.length - 1
  let checks = 0
  frames.push({ left, right, line: 'init', checks, say: `Left starts at the smallest value, right at the largest. Looking for a pair that adds to ${target}.` })
  while (left < right) {
    const sum = sorted[left]! + sorted[right]!
    checks++
    frames.push({ left, right, sum, line: 'sum', checks, say: `${sorted[left]} + ${sorted[right]} = ${sum}.` })
    if (sum === target) {
      frames.push({ left, right, sum, line: 'found', checks, found: true, say: `${sum} is the target: indexes ${left} and ${right}, after ${checks} ${checks === 1 ? 'check' : 'checks'}.` })
      return frames
    }
    if (sum < target) {
      frames.push({ left, right, sum, line: 'move-left', checks, say: `Too small. Only a bigger left value can help, so move left one step right. ${sorted[left]} can't pair with anything.` })
      left++
    } else {
      frames.push({ left, right, sum, line: 'move-right', checks, say: `Too big. Only a smaller right value can help, so move right one step left. ${sorted[right]} can't pair with anything.` })
      right--
    }
  }
  frames.push({ left, right, line: 'none', checks, say: `The pointers met: no pair adds to ${target}. That took ${checks} checks, where trying every pair takes up to ${(sorted.length * (sorted.length - 1)) / 2}.` })
  return frames
}

export type WindowLine = 'first' | 'slide' | 'best' | 'done'

export interface WindowFrame {
  start: number
  /** Inclusive end of the window. */
  end: number
  sum: number
  best: number
  bestStart: number
  line: WindowLine
  say: string
  /** Additions and subtractions so far. */
  ops: number
  leaving?: number
  entering?: number
}

export function slidingWindowFrames(values: number[], k: number): WindowFrame[] {
  const frames: WindowFrame[] = []
  let sum = 0
  let ops = 0
  for (let i = 0; i < k; i++) {
    sum += values[i]!
    ops++
  }
  let best = sum
  let bestStart = 0
  frames.push({ start: 0, end: k - 1, sum, best, bestStart, ops, line: 'first', say: `Add up the first window of ${k}: ${values.slice(0, k).join(' + ')} = ${sum}.` })
  for (let end = k; end < values.length; end++) {
    const start = end - k + 1
    const leaving = values[start - 1]!
    const entering = values[end]!
    sum = sum - leaving + entering
    ops += 2
    frames.push({ start, end, sum, best, bestStart, ops, leaving, entering, line: 'slide', say: `Slide right: subtract ${leaving} leaving, add ${entering} entering. Sum = ${sum}. No need to re-add the middle.` })
    if (sum > best) {
      best = sum
      bestStart = start
      frames.push({ start, end, sum, best, bestStart, ops, line: 'best', say: `${sum} beats the best so far.` })
    }
  }
  frames.push({
    start: bestStart,
    end: bestStart + k - 1,
    sum: best,
    best,
    bestStart,
    ops,
    line: 'done',
    say: `Best window sum: ${best}. That took ${ops} additions and subtractions; summing every window from scratch takes ${(values.length - k + 1) * k}.`,
  })
  return frames
}

export const pairSnippet = marked<PairLine>({
  ts: `
function pairSum(sorted: number[], target: number) {
  let left = 0, right = sorted.length - 1 @@init
  while (left < right) { @@loop
    const sum = sorted[left] + sorted[right] @@sum
    if (sum === target) return [left, right] @@found
    if (sum < target) left++ @@move-left
    else right-- @@move-right
  }
  return null @@none
}`,
  py: `
def pair_sum(sorted_list, target):
    left, right = 0, len(sorted_list) - 1 @@init
    while left < right: @@loop
        total = sorted_list[left] + sorted_list[right] @@sum
        if total == target: @@found
            return left, right @@found
        if total < target: @@move-left
            left += 1 @@move-left
        else: @@move-right
            right -= 1 @@move-right
    return None @@none`,
})

export const windowSnippet = marked<WindowLine>({
  ts: `
function maxWindowSum(values: number[], k: number) {
  let sum = 0
  for (let i = 0; i < k; i++) sum += values[i] @@first
  let best = sum
  for (let end = k; end < values.length; end++) {
    sum += values[end] - values[end - k] @@slide
    best = Math.max(best, sum) @@best
  }
  return best @@done
}`,
  py: `
def max_window_sum(values, k):
    total = sum(values[:k]) @@first
    best = total
    for end in range(k, len(values)):
        total += values[end] - values[end - k] @@slide
        best = max(best, total) @@best
    return best @@done`,
})
