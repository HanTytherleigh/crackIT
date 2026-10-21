// Pre-, in- and post-order DFS and BFS over a binary tree, recorded step by step.

import { marked } from './snippet'

export interface TNode {
  id: number
  value: number
  left: number | null
  right: number | null
  /** Position in level order (heap numbering), used for layout. */
  slot: number
}

/** Builds a tree from level-order values, where null marks a missing child. */
export function treeFromLevelOrder(values: (number | null)[]): TNode[] {
  const nodes: TNode[] = []
  const idAt = new Map<number, number>()
  values.forEach((v, slot) => {
    if (v === null) return
    idAt.set(slot, nodes.length)
    nodes.push({ id: nodes.length, value: v, left: null, right: null, slot })
  })
  for (const n of nodes) {
    n.left = idAt.get(2 * n.slot + 1) ?? null
    n.right = idAt.get(2 * n.slot + 2) ?? null
  }
  return nodes
}

export type Order = 'pre' | 'in' | 'post' | 'bfs'
export type TravLine = 'start' | 'enter' | 'visit' | 'left' | 'right' | 'leave' | 'dequeue' | 'enqueue' | 'done'

export interface TravFrame {
  current: number | null
  /** DFS: the recursion stack of node ids. BFS: the queue. */
  pending: number[]
  visited: number[]
  line: TravLine
  say: string
}

export function traversalFrames(nodes: TNode[], order: Order): TravFrame[] {
  const frames: TravFrame[] = []
  const visited: number[] = []
  const v = (id: number) => nodes[id]!.value
  if (nodes.length === 0) return [{ current: null, pending: [], visited: [], line: 'done', say: 'Empty tree.' }]

  if (order === 'bfs') {
    const queue = [0]
    frames.push({ current: null, pending: [...queue], visited: [], line: 'start', say: `Start with the root, ${v(0)}, in the queue.` })
    while (queue.length) {
      const id = queue.shift()!
      frames.push({ current: id, pending: [...queue], visited: [...visited], line: 'dequeue', say: `Take ${v(id)} from the front of the queue.` })
      visited.push(id)
      frames.push({ current: id, pending: [...queue], visited: [...visited], line: 'visit', say: `Visit ${v(id)}.` })
      const kids = [nodes[id]!.left, nodes[id]!.right].filter((k): k is number => k !== null)
      if (kids.length) {
        queue.push(...kids)
        frames.push({ current: id, pending: [...queue], visited: [...visited], line: 'enqueue', say: `Add its children (${kids.map(v).join(', ')}) to the back of the queue. They wait behind everything on this level.` })
      }
    }
  } else {
    const stack: number[] = []
    const label = { pre: 'before', in: 'between', post: 'after' }[order]
    const walk = (id: number) => {
      stack.push(id)
      frames.push({ current: id, pending: [...stack], visited: [...visited], line: 'enter', say: `Enter ${v(id)} (stack depth ${stack.length}).` })
      const visit = () => {
        visited.push(id)
        frames.push({ current: id, pending: [...stack], visited: [...visited], line: 'visit', say: `Visit ${v(id)}: ${order}-order visits a node ${label} its subtrees.` })
      }
      if (order === 'pre') visit()
      const { left, right } = nodes[id]!
      if (left !== null) {
        frames.push({ current: id, pending: [...stack], visited: [...visited], line: 'left', say: `Go left from ${v(id)} to ${v(left)}.` })
        walk(left)
      }
      if (order === 'in') visit()
      if (right !== null) {
        frames.push({ current: id, pending: [...stack], visited: [...visited], line: 'right', say: `Go right from ${v(id)} to ${v(right)}.` })
        walk(right)
      }
      if (order === 'post') visit()
      stack.pop()
      frames.push({ current: stack.at(-1) ?? null, pending: [...stack], visited: [...visited], line: 'leave', say: `Done with ${v(id)}'s subtree: return${stack.length ? ` to ${v(stack.at(-1)!)}` : ''}.` })
    }
    walk(0)
  }
  frames.push({ current: null, pending: [], visited: [...visited], line: 'done', say: `Visit order: ${visited.map(v).join(', ')}. Every node once: O(n).` })
  return frames
}

const dfs = (visitAt: 'pre' | 'in' | 'post') =>
  marked<TravLine>({
    ts: `
function walk(node: TreeNode | null) { @@enter
  if (node === null) return
${visitAt === 'pre' ? '  visit(node) @@visit\n' : ''}  walk(node.left) @@left
${visitAt === 'in' ? '  visit(node) @@visit\n' : ''}  walk(node.right) @@right
${visitAt === 'post' ? '  visit(node) @@visit\n' : ''}} @@leave @@done`,
    py: `
def walk(node): @@enter
    if node is None:
        return
${visitAt === 'pre' ? '    visit(node) @@visit\n' : ''}    walk(node.left) @@left
${visitAt === 'in' ? '    visit(node) @@visit\n' : ''}    walk(node.right) @@right
${visitAt === 'post' ? '    visit(node) @@visit\n' : ''}    # return to the caller @@leave @@done`,
  })

export const traversalSnippets: Record<Order, ReturnType<typeof dfs>> = {
  pre: dfs('pre'),
  in: dfs('in'),
  post: dfs('post'),
  bfs: marked<TravLine>({
    ts: `
function levelOrder(root: TreeNode) {
  const queue = [root] @@start
  while (queue.length) {
    const node = queue.shift()! // a deque in real code @@dequeue
    visit(node) @@visit
    if (node.left) queue.push(node.left) @@enqueue
    if (node.right) queue.push(node.right) @@enqueue
  }
} @@done`,
    py: `
from collections import deque
def level_order(root):
    queue = deque([root]) @@start
    while queue:
        node = queue.popleft() @@dequeue
        visit(node) @@visit
        if node.left: queue.append(node.left) @@enqueue
        if node.right: queue.append(node.right) @@enqueue
    # done @@done`,
  }),
}
