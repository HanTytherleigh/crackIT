// Fills DP tables cell by cell, recording which earlier cells each one reads,
// then traces back through the table to recover the actual answer.

import { marked } from './snippet'

export type DPMode = 'fib' | 'knapsack' | 'lcs'
export type DPLine = 'base' | 'fill' | 'skip' | 'take' | 'match' | 'nomatch' | 'trace' | 'done'
export type Cell = [number, number]

export interface DPFrame {
  table: (number | null)[][]
  cell?: Cell
  deps: Cell[]
  /** Cells on the traceback path. */
  path: Cell[]
  line: DPLine
  say: string
}

export const KNAPSACK_ITEMS = [
  { w: 1, v: 1 },
  { w: 3, v: 4 },
  { w: 4, v: 5 },
  { w: 5, v: 7 },
]
export const KNAPSACK_CAPACITY = 7
export const LCS_A = 'ABCBDAB'
export const LCS_B = 'BDCAB'

const copy = (t: (number | null)[][]) => t.map((r) => [...r])

export function fibFrames(n = 10): DPFrame[] {
  const t: (number | null)[][] = [Array(n + 1).fill(null)]
  const frames: DPFrame[] = []
  const row = t[0]!
  row[0] = 0
  frames.push({ table: copy(t), cell: [0, 0], deps: [], path: [], line: 'base', say: 'Base case: fib(0) = 0.' })
  row[1] = 1
  frames.push({ table: copy(t), cell: [0, 1], deps: [], path: [], line: 'base', say: 'Base case: fib(1) = 1.' })
  for (let i = 2; i <= n; i++) {
    row[i] = row[i - 1]! + row[i - 2]!
    frames.push({ table: copy(t), cell: [0, i], deps: [[0, i - 1], [0, i - 2]], path: [], line: 'fill', say: `fib(${i}) = fib(${i - 1}) + fib(${i - 2}) = ${row[i - 1]} + ${row[i - 2]} = ${row[i]}. Each cell is computed once: O(n).` })
  }
  frames.push({ table: copy(t), cell: [0, n], deps: [], path: [[0, n]], line: 'done', say: `fib(${n}) = ${row[n]}. Only the last two cells are ever read, so two variables would do: O(1) space.` })
  return frames
}

export function knapsackFrames(items = KNAPSACK_ITEMS, cap = KNAPSACK_CAPACITY): DPFrame[] {
  const n = items.length
  const t: (number | null)[][] = Array.from({ length: n + 1 }, () => Array(cap + 1).fill(null))
  const frames: DPFrame[] = []
  for (let w = 0; w <= cap; w++) t[0]![w] = 0
  frames.push({ table: copy(t), deps: [], path: [], line: 'base', say: 'Row 0 means "no items yet": the best value is 0 at every capacity.' })
  for (let i = 1; i <= n; i++) {
    const { w: wi, v: vi } = items[i - 1]!
    for (let w = 0; w <= cap; w++) {
      const skip = t[i - 1]![w]!
      if (wi > w) {
        t[i]![w] = skip
        frames.push({ table: copy(t), cell: [i, w], deps: [[i - 1, w]], path: [], line: 'skip', say: `Item ${i} (weight ${wi}) doesn't fit in capacity ${w}: copy the value from above, ${skip}.` })
      } else {
        const take = vi + t[i - 1]![w - wi]!
        t[i]![w] = Math.max(skip, take)
        frames.push({
          table: copy(t),
          cell: [i, w],
          deps: [[i - 1, w], [i - 1, w - wi]],
          path: [],
          line: 'take',
          say: `Capacity ${w}: skip item ${i} → ${skip}, or take it → ${vi} + best(${w - wi}) = ${take}. Keep ${t[i]![w]}.`,
        })
      }
    }
  }
  // Trace back: if a cell differs from the one above, its item was taken.
  const path: Cell[] = []
  const chosen: number[] = []
  let w = cap
  for (let i = n; i >= 1; i--) {
    path.push([i, w])
    if (t[i]![w] !== t[i - 1]![w]) {
      chosen.unshift(i)
      frames.push({ table: copy(t), cell: [i, w], deps: [[i - 1, w - items[i - 1]!.w]], path: [...path], line: 'trace', say: `${t[i]![w]} differs from the cell above, so item ${i} was taken. Jump left by its weight, ${items[i - 1]!.w}.` })
      w -= items[i - 1]!.w
    } else {
      frames.push({ table: copy(t), cell: [i, w], deps: [[i - 1, w]], path: [...path], line: 'trace', say: `Same as the cell above, so item ${i} was not taken.` })
    }
  }
  frames.push({
    table: copy(t),
    deps: [],
    path,
    line: 'done',
    say: `Best value ${t[n]![cap]}, taking items ${chosen.join(' and ')}. The table has (n + 1) × (W + 1) cells: O(n × W).`,
  })
  return frames
}

export function lcsFrames(a = LCS_A, b = LCS_B): DPFrame[] {
  const t: (number | null)[][] = Array.from({ length: a.length + 1 }, () => Array(b.length + 1).fill(null))
  const frames: DPFrame[] = []
  for (let i = 0; i <= a.length; i++) t[i]![0] = 0
  for (let j = 0; j <= b.length; j++) t[0]![j] = 0
  frames.push({ table: copy(t), deps: [], path: [], line: 'base', say: 'Row 0 and column 0 compare against an empty string: the LCS length is 0.' })
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      if (a[i - 1] === b[j - 1]) {
        t[i]![j] = t[i - 1]![j - 1]! + 1
        frames.push({ table: copy(t), cell: [i, j], deps: [[i - 1, j - 1]], path: [], line: 'match', say: `"${a[i - 1]}" matches "${b[j - 1]}": 1 + the diagonal = ${t[i]![j]}.` })
      } else {
        t[i]![j] = Math.max(t[i - 1]![j]!, t[i]![j - 1]!)
        frames.push({ table: copy(t), cell: [i, j], deps: [[i - 1, j], [i, j - 1]], path: [], line: 'nomatch', say: `"${a[i - 1]}" ≠ "${b[j - 1]}": take the larger of above (${t[i - 1]![j]}) and left (${t[i]![j - 1]}).` })
      }
    }
  }
  const path: Cell[] = []
  let i = a.length
  let j = b.length
  let out = ''
  while (i > 0 && j > 0) {
    path.push([i, j])
    if (a[i - 1] === b[j - 1]) {
      out = a[i - 1] + out
      frames.push({ table: copy(t), cell: [i, j], deps: [[i - 1, j - 1]], path: [...path], line: 'trace', say: `"${a[i - 1]}" matched here: it is in the subsequence. Step diagonally.` })
      i--
      j--
    } else if (t[i - 1]![j]! >= t[i]![j - 1]!) {
      frames.push({ table: copy(t), cell: [i, j], deps: [[i - 1, j]], path: [...path], line: 'trace', say: 'No match: step towards the larger neighbour (up).' })
      i--
    } else {
      frames.push({ table: copy(t), cell: [i, j], deps: [[i, j - 1]], path: [...path], line: 'trace', say: 'No match: step towards the larger neighbour (left).' })
      j--
    }
  }
  frames.push({ table: copy(t), deps: [], path, line: 'done', say: `LCS length ${t[a.length]![b.length]}: "${out}". The table has (m + 1) × (n + 1) cells, each O(1): O(m × n).` })
  return frames
}

export const dpSnippets = {
  fib: marked<DPLine>({
    ts: `
function fib(n: number): number {
  const dp = [0, 1] @@base
  for (let i = 2; i <= n; i++) {
    dp[i] = dp[i - 1] + dp[i - 2] @@fill
  }
  return dp[n] @@done
}`,
    py: `
def fib(n):
    dp = [0, 1] + [0] * (n - 1) @@base
    for i in range(2, n + 1):
        dp[i] = dp[i - 1] + dp[i - 2] @@fill
    return dp[n] @@done`,
  }),
  knapsack: marked<DPLine>({
    ts: `
function knapsack(items: { w: number; v: number }[], cap: number) {
  const n = items.length
  const dp = Array.from({ length: n + 1 }, () => new Array(cap + 1).fill(0)) @@base
  for (let i = 1; i <= n; i++) {
    const { w, v } = items[i - 1]
    for (let c = 0; c <= cap; c++) {
      dp[i][c] = dp[i - 1][c] // skip item i @@skip @@take
      if (w <= c) dp[i][c] = Math.max(dp[i][c], v + dp[i - 1][c - w]) @@take
    }
  }
  return dp[n][cap] @@done @@trace
}`,
    py: `
def knapsack(items, cap):
    n = len(items)
    dp = [[0] * (cap + 1) for _ in range(n + 1)] @@base
    for i in range(1, n + 1):
        w, v = items[i - 1]
        for c in range(cap + 1):
            dp[i][c] = dp[i - 1][c]  # skip item i @@skip @@take
            if w <= c: @@take
                dp[i][c] = max(dp[i][c], v + dp[i - 1][c - w]) @@take
    return dp[n][cap] @@done @@trace`,
  }),
  lcs: marked<DPLine>({
    ts: `
function lcs(a: string, b: string): number {
  const dp = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0)) @@base
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      if (a[i - 1] === b[j - 1]) dp[i][j] = dp[i - 1][j - 1] + 1 @@match
      else dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]) @@nomatch
    }
  }
  return dp[a.length][b.length] @@done @@trace
}`,
    py: `
def lcs(a, b):
    dp = [[0] * (len(b) + 1) for _ in range(len(a) + 1)] @@base
    for i in range(1, len(a) + 1):
        for j in range(1, len(b) + 1):
            if a[i - 1] == b[j - 1]: @@match
                dp[i][j] = dp[i - 1][j - 1] + 1 @@match
            else: @@nomatch
                dp[i][j] = max(dp[i - 1][j], dp[i][j - 1]) @@nomatch
    return dp[len(a)][len(b)] @@done @@trace`,
  }),
}
