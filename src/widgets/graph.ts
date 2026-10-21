// Undirected graph search: BFS, iterative DFS and BFS shortest path, recorded step by step.

import { marked } from './snippet'

export interface GNode {
  id: number
  label: string
  x: number
  y: number
}
export interface Graph {
  nodes: GNode[]
  edges: [number, number][]
}

export const edgeKey = (a: number, b: number) => (a < b ? `${a}-${b}` : `${b}-${a}`)

/** Neighbours in label order, so runs are deterministic and easy to follow. */
export function adjacency(g: Graph): Map<number, number[]> {
  const adj = new Map<number, number[]>(g.nodes.map((n) => [n.id, []]))
  for (const [a, b] of g.edges) {
    adj.get(a)?.push(b)
    adj.get(b)?.push(a)
  }
  const label = new Map(g.nodes.map((n) => [n.id, n.label]))
  for (const list of adj.values()) list.sort((a, b) => label.get(a)!.localeCompare(label.get(b)!))
  return adj
}

export type Algo = 'bfs' | 'dfs' | 'path'
export type GraphLine = 'start' | 'take' | 'skip' | 'visit' | 'look' | 'add' | 'seen' | 'found' | 'done' | 'unreachable'

export interface GraphFrame {
  current: number | null
  frontier: number[]
  visited: number[]
  dist: Record<number, number>
  parent: Record<number, number>
  edge?: [number, number]
  path?: number[]
  line: GraphLine
  say: string
}

export function searchFrames(g: Graph, algo: Algo, start: number, target?: number): GraphFrame[] {
  const adj = adjacency(g)
  const name = (id: number) => g.nodes.find((n) => n.id === id)!.label
  const frames: GraphFrame[] = []
  const visited: number[] = []
  const seen = new Set<number>([start])
  const dist: Record<number, number> = { [start]: 0 }
  const parent: Record<number, number> = {}
  const frontier: number[] = [start]
  const push = (f: Omit<GraphFrame, 'frontier' | 'visited' | 'dist' | 'parent'>) =>
    frames.push({ frontier: [...frontier], visited: [...visited], dist: { ...dist }, parent: { ...parent }, ...f })

  const useQueue = algo !== 'dfs'
  push({ current: null, line: 'start', say: `Start at ${name(start)}. The frontier is a ${useQueue ? 'queue (first in, first out)' : 'stack (last in, first out)'}.` })

  while (frontier.length) {
    const id = useQueue ? frontier.shift()! : frontier.pop()!
    if (!useQueue && visited.includes(id)) {
      push({ current: id, line: 'skip', say: `${name(id)} was already visited by another route: skip it.` })
      continue
    }
    push({ current: id, line: 'take', say: `Take ${name(id)} from the ${useQueue ? 'front of the queue' : 'top of the stack'}.` })
    visited.push(id)
    push({ current: id, line: 'visit', say: useQueue ? `Visit ${name(id)}: distance ${dist[id]} from ${name(start)}.` : `Visit ${name(id)}.` })

    if (algo === 'path' && id === target) {
      const path = [id]
      while (path[0] !== start) path.unshift(parent[path[0]!]!)
      push({ current: id, path, line: 'found', say: `Reached ${name(id)}. Follow the parent links back: ${path.map(name).join(' → ')}, ${path.length - 1} edges. BFS reaches each node by the fewest edges first, so this is a shortest path.` })
      return frames
    }

    const neighbours = useQueue ? adj.get(id)! : [...adj.get(id)!].reverse()
    for (const nb of neighbours) {
      if (useQueue) {
        if (seen.has(nb)) {
          push({ current: id, edge: [id, nb], line: 'seen', say: `${name(nb)} is already found: ignore it.` })
          continue
        }
        seen.add(nb)
        dist[nb] = dist[id]! + 1
        parent[nb] = id
        frontier.push(nb)
        push({ current: id, edge: [id, nb], line: 'add', say: `Found ${name(nb)} at distance ${dist[nb]}. Add it to the back of the queue, and remember we came from ${name(id)}.` })
      } else if (!visited.includes(nb)) {
        if (!(nb in parent)) parent[nb] = id
        frontier.push(nb)
        push({ current: id, edge: [id, nb], line: 'add', say: `Push ${name(nb)} onto the stack.` })
      }
    }
  }

  if (algo === 'path') {
    push({ current: null, line: 'unreachable', say: `The queue ran out without reaching ${name(target!)}: there is no path.` })
  } else {
    push({ current: null, line: 'done', say: `Visited ${visited.length} of ${g.nodes.length} nodes: ${visited.map(name).join(', ')}. Each node and edge is handled a constant number of times: O(V + E).` })
  }
  return frames
}

export const graphSnippets = {
  bfs: marked<GraphLine>({
    ts: `
function bfs(adj: Map<string, string[]>, start: string) {
  const dist = new Map([[start, 0]]) @@start
  const queue = [start] @@start
  while (queue.length) {
    const node = queue.shift()! // use a real deque @@take
    visit(node) @@visit @@found
    for (const next of adj.get(node)!) {
      if (dist.has(next)) continue @@seen
      dist.set(next, dist.get(node)! + 1) @@add
      queue.push(next) @@add
    }
  }
} @@done @@unreachable`,
    py: `
from collections import deque
def bfs(adj, start):
    dist = {start: 0} @@start
    queue = deque([start]) @@start
    while queue:
        node = queue.popleft() @@take
        visit(node) @@visit @@found
        for nxt in adj[node]:
            if nxt in dist: @@seen
                continue @@seen
            dist[nxt] = dist[node] + 1 @@add
            queue.append(nxt) @@add
    # done @@done @@unreachable`,
  }),
  dfs: marked<GraphLine>({
    ts: `
function dfs(adj: Map<string, string[]>, start: string) {
  const visited = new Set<string>()
  const stack = [start] @@start
  while (stack.length) {
    const node = stack.pop()! @@take
    if (visited.has(node)) continue @@skip
    visited.add(node) @@visit
    visit(node) @@visit
    for (const next of [...adj.get(node)!].reverse()) {
      if (!visited.has(next)) stack.push(next) @@add
    }
  }
} @@done`,
    py: `
def dfs(adj, start):
    visited = set()
    stack = [start] @@start
    while stack:
        node = stack.pop() @@take
        if node in visited: @@skip
            continue @@skip
        visited.add(node) @@visit
        visit(node) @@visit
        for nxt in reversed(adj[node]):
            if nxt not in visited:
                stack.append(nxt) @@add
    # done @@done`,
  }),
}

/** A small example graph laid out to fit the widget's canvas. */
export function presetGraph(): Graph {
  const pts: [string, number, number][] = [
    ['A', 40, 50], ['B', 130, 30], ['C', 110, 130], ['D', 210, 90], ['E', 160, 205], ['F', 260, 175], ['G', 310, 60],
  ]
  const nodes = pts.map(([label, x, y], id) => ({ id, label, x, y }))
  const id = (l: string) => nodes.find((n) => n.label === l)!.id
  const pairs = ['AB', 'AC', 'BD', 'CD', 'CE', 'DF', 'EF', 'FG']
  return { nodes, edges: pairs.map((p) => [id(p[0]!), id(p[1]!)] as [number, number]) }
}
