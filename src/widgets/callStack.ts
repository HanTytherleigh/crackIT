// Records every call and return of factorial and Fibonacci, so the call stack and the
// recursion tree can be stepped through, with repeated work and memo hits marked.

import { marked } from './snippet'

export type Fn = 'factorial' | 'fib'
export type CallLine = 'enter' | 'base' | 'recurse' | 'combine' | 'cache-hit' | 'store'

export interface CallNode {
  id: number
  arg: number
  parent: number | null
  depth: number
  status: 'active' | 'done' | 'cached'
  result?: number
  /** True when this exact argument was already computed earlier: repeated work. */
  repeat: boolean
}

export interface CallFrame {
  nodes: CallNode[]
  stack: number[]
  line: CallLine
  say: string
  calls: number
}

export function callFrames(fn: Fn, n: number, memo = false): CallFrame[] {
  const nodes: CallNode[] = []
  const frames: CallFrame[] = []
  const stack: number[] = []
  const cache = new Map<number, number>()
  const computed = new Set<number>()
  let calls = 0
  const name = (k: number) => (fn === 'fib' ? `fib(${k})` : `fact(${k})`)
  const snap = (line: CallLine, say: string) =>
    frames.push({ nodes: nodes.map((x) => ({ ...x })), stack: [...stack], line, say, calls })

  function call(k: number, parent: number | null): number {
    const node: CallNode = { id: nodes.length, arg: k, parent, depth: stack.length, status: 'active', repeat: computed.has(k) }
    nodes.push(node)
    stack.push(node.id)
    calls++
    snap('enter', `Call ${name(k)}: a new frame goes on the stack (depth ${stack.length}).${node.repeat && !memo ? ` ${name(k)} was already worked out once: this is repeated work.` : ''}`)

    let result: number
    if (memo && cache.has(k)) {
      result = cache.get(k)!
      node.status = 'cached'
      node.result = result
      snap('cache-hit', `${name(k)} is in the memo: return ${result} straight away, no further calls.`)
    } else if (k <= 1) {
      result = fn === 'fib' ? k : 1
      node.result = result
      node.status = 'done'
      snap('base', `Base case: ${name(k)} = ${result}. No more calls, so this frame can return.`)
    } else if (fn === 'factorial') {
      snap('recurse', `${name(k)} needs ${name(k - 1)} first, so it waits on the stack.`)
      const sub = call(k - 1, node.id)
      result = k * sub
      node.result = result
      node.status = 'done'
      snap('combine', `${name(k - 1)} returned ${sub}, so ${name(k)} = ${k} × ${sub} = ${result}. Pop this frame.`)
    } else {
      snap('recurse', `${name(k)} needs ${name(k - 1)} and ${name(k - 2)}. Start with ${name(k - 1)}.`)
      const a = call(k - 1, node.id)
      snap('recurse', `${name(k - 1)} came back as ${a}. Now ${name(k - 2)}.`)
      const b = call(k - 2, node.id)
      result = a + b
      node.result = result
      node.status = 'done'
      if (memo) {
        cache.set(k, result)
        snap('store', `${name(k)} = ${a} + ${b} = ${result}. Save it in the memo, then return.`)
      } else {
        snap('combine', `${name(k)} = ${a} + ${b} = ${result}. Pop this frame.`)
      }
    }
    computed.add(k)
    stack.pop()
    return result
  }

  const result = call(n, null)
  frames.push({
    nodes: nodes.map((x) => ({ ...x })),
    stack: [],
    line: 'combine',
    calls,
    say: `Done: ${name(n)} = ${result}, using ${calls} ${calls === 1 ? 'call' : 'calls'}${fn === 'fib' && !memo ? `. With a memo it would take ${2 * n - 1}` : ''}.`,
  })
  return frames
}

/** x positions for a tree drawn by leaf order: leaves spread evenly, parents centred over children. */
export function layoutTree(nodes: Pick<CallNode, 'id' | 'parent'>[]): Map<number, number> {
  const children = new Map<number, number[]>()
  for (const n of nodes) if (n.parent !== null) children.set(n.parent, [...(children.get(n.parent) ?? []), n.id])
  const x = new Map<number, number>()
  let leaf = 0
  const place = (id: number): number => {
    const kids = children.get(id) ?? []
    const pos = kids.length === 0 ? leaf++ : kids.map(place).reduce((a, b) => a + b, 0) / kids.length
    x.set(id, pos)
    return pos
  }
  const root = nodes.find((n) => n.parent === null)
  if (root) place(root.id)
  const leaves = Math.max(1, leaf)
  for (const [id, v] of x) x.set(id, (v + 0.5) / leaves)
  return x
}

export const callSnippets = {
  factorial: marked<CallLine>({
    ts: `
function fact(n: number): number { @@enter
  if (n <= 1) return 1 @@base
  return n * fact(n - 1) @@recurse @@combine
}`,
    py: `
def fact(n): @@enter
    if n <= 1:
        return 1 @@base
    return n * fact(n - 1) @@recurse @@combine`,
  }),
  fib: marked<CallLine>({
    ts: `
function fib(n: number): number { @@enter
  if (n <= 1) return n @@base
  return fib(n - 1) + fib(n - 2) @@recurse @@combine
}`,
    py: `
def fib(n): @@enter
    if n <= 1:
        return n @@base
    return fib(n - 1) + fib(n - 2) @@recurse @@combine`,
  }),
  fibMemo: marked<CallLine>({
    ts: `
const memo = new Map<number, number>()
function fib(n: number): number { @@enter
  if (memo.has(n)) return memo.get(n)! @@cache-hit
  if (n <= 1) return n @@base
  const result = fib(n - 1) + fib(n - 2) @@recurse
  memo.set(n, result) @@store
  return result @@combine
}`,
    py: `
memo = {}
def fib(n): @@enter
    if n in memo:
        return memo[n] @@cache-hit
    if n <= 1:
        return n @@base
    result = fib(n - 1) + fib(n - 2) @@recurse
    memo[n] = result @@store
    return result @@combine`,
  }),
}
