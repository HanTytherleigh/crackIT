// Linked list operations as frames of node and pointer state, so each pointer rewrite can be stepped.

import { marked } from './snippet'

export type NodeId = number
export interface LNode {
  id: NodeId
  value: number
  next: NodeId | null
}
export interface ListState {
  nodes: LNode[]
  head: NodeId | null
}
export type PointerName = 'head' | 'prev' | 'curr' | 'next' | 'new'

export type LLLine = 'walk' | 'create' | 'link-new' | 'link-prev' | 'move-head' | 'unlink' | 'save-next' | 'flip' | 'advance' | 'set-head' | 'done'

export interface LLFrame {
  state: ListState
  pointers: Partial<Record<Exclude<PointerName, 'head'>, NodeId | null>>
  /** Node whose next pointer just changed, to animate its arrow. */
  changed?: NodeId
  /** A node not yet linked into the list is drawn below the row. */
  floating?: NodeId
  line: LLLine
  say: string
}

export type LLOp =
  | { kind: 'insert-head'; value: number }
  | { kind: 'insert-after'; position: number; value: number }
  | { kind: 'delete'; position: number }
  | { kind: 'reverse' }

const clone = (s: ListState): ListState => ({ head: s.head, nodes: s.nodes.map((n) => ({ ...n })) })
const byId = (s: ListState, id: NodeId) => s.nodes.find((n) => n.id === id)!

export function fromValues(values: number[]): ListState {
  const nodes = values.map((value, i) => ({ id: i + 1, value, next: i + 1 < values.length ? i + 2 : null }))
  return { nodes, head: nodes.length ? 1 : null }
}

export function toValues(s: ListState): number[] {
  const out: number[] = []
  let cur = s.head
  const seen = new Set<NodeId>()
  while (cur !== null && !seen.has(cur)) {
    seen.add(cur)
    const n = byId(s, cur)
    out.push(n.value)
    cur = n.next
  }
  return out
}

/** Ids in list order, used to lay nodes out left to right. */
export function order(s: ListState): NodeId[] {
  const out: NodeId[] = []
  let cur = s.head
  const seen = new Set<NodeId>()
  while (cur !== null && !seen.has(cur)) {
    seen.add(cur)
    out.push(cur)
    cur = byId(s, cur).next
  }
  return out
}

export function llFrames(start: ListState, op: LLOp): LLFrame[] {
  const s = clone(start)
  const frames: LLFrame[] = []
  const push = (f: Omit<LLFrame, 'state'>) => frames.push({ state: clone(s), ...f })
  const nextId = Math.max(0, ...s.nodes.map((n) => n.id)) + 1
  const val = (id: NodeId | null) => (id === null ? 'null' : String(byId(s, id).value))

  switch (op.kind) {
    case 'insert-head': {
      const oldHead = s.head
      s.nodes.push({ id: nextId, value: op.value, next: null })
      push({ pointers: { new: nextId }, floating: nextId, line: 'create', say: `Create a node holding ${op.value}. Nothing points to it yet.` })
      byId(s, nextId).next = oldHead
      push({ pointers: { new: nextId }, floating: nextId, changed: nextId, line: 'link-new', say: `Point the new node at the current head (${val(oldHead)}). Do this before moving head, or you lose the list.` })
      s.head = nextId
      push({ pointers: { new: nextId }, line: 'move-head', say: `Move head to the new node. Two pointer changes, no shifting: O(1).` })
      break
    }
    case 'insert-after': {
      let curr = s.head!
      push({ pointers: { curr }, line: 'walk', say: `Start at the head. A linked list has no index: to reach position ${op.position} we must walk.` })
      for (let i = 0; i < op.position; i++) {
        curr = byId(s, curr).next!
        push({ pointers: { curr }, line: 'walk', say: `Step to position ${i + 1} (${val(curr)}).` })
      }
      s.nodes.push({ id: nextId, value: op.value, next: null })
      push({ pointers: { curr, new: nextId }, floating: nextId, line: 'create', say: `Create a node holding ${op.value}.` })
      byId(s, nextId).next = byId(s, curr).next
      push({ pointers: { curr, new: nextId }, floating: nextId, changed: nextId, line: 'link-new', say: `First point the new node at curr's next (${val(byId(s, nextId).next)}).` })
      byId(s, curr).next = nextId
      push({ pointers: { curr, new: nextId }, changed: curr, line: 'link-prev', say: `Then point curr at the new node. Done in the other order, the rest of the list would be lost.` })
      break
    }
    case 'delete': {
      if (op.position === 0) {
        const old = s.head!
        push({ pointers: { curr: old }, line: 'move-head', say: `Deleting the head: just move head on to the second node.` })
        s.head = byId(s, old).next
        s.nodes = s.nodes.filter((n) => n.id !== old)
        push({ pointers: {}, line: 'move-head', say: `Head now points at ${val(s.head)}. The old node is unreachable and will be freed: O(1).` })
        break
      }
      let prev = s.head!
      push({ pointers: { prev }, line: 'walk', say: `To delete position ${op.position}, walk to the node before it.` })
      for (let i = 0; i < op.position - 1; i++) {
        prev = byId(s, prev).next!
        push({ pointers: { prev }, line: 'walk', say: `Step to position ${i + 1} (${val(prev)}).` })
      }
      const target = byId(s, prev).next!
      push({ pointers: { prev, curr: target }, line: 'unlink', say: `The node to delete is ${val(target)}.` })
      byId(s, prev).next = byId(s, target).next
      push({ pointers: { prev, curr: target }, changed: prev, line: 'unlink', say: `Point prev past it, at ${val(byId(s, prev).next)}. That one change removes it.` })
      s.nodes = s.nodes.filter((n) => n.id !== target)
      push({ pointers: { prev }, line: 'done', say: `Removed. The walk was O(n), but the unlink itself was O(1).` })
      break
    }
    case 'reverse': {
      let prev: NodeId | null = null
      let curr: NodeId | null = s.head
      push({ pointers: { prev, curr }, line: 'walk', say: `prev starts at null, curr at the head.` })
      while (curr !== null) {
        const next: NodeId | null = byId(s, curr).next
        push({ pointers: { prev, curr, next }, line: 'save-next', say: `Save next (${val(next)}) before touching curr, or we lose the rest of the list.` })
        byId(s, curr).next = prev
        push({ pointers: { prev, curr, next }, changed: curr, line: 'flip', say: `Flip curr's arrow to point back at prev (${val(prev)}).` })
        prev = curr
        curr = next
        push({ pointers: { prev, curr }, line: 'advance', say: `Move prev and curr one step along.` })
      }
      s.head = prev
      push({ pointers: { prev }, line: 'set-head', say: `curr is null, so prev is the new head. Each node was visited once: O(n) time, O(1) extra space.` })
      break
    }
  }
  return frames
}

export const llSnippets = {
  'insert-head': marked<LLLine>({
    ts: `
function insertHead(head: ListNode | null, value: number) {
  const node = new ListNode(value) @@create
  node.next = head @@link-new
  return node // the new head @@move-head
}`,
    py: `
def insert_head(head, value):
    node = ListNode(value) @@create
    node.next = head @@link-new
    return node  # the new head @@move-head`,
  }),
  'insert-after': marked<LLLine>({
    ts: `
function insertAfter(head: ListNode, position: number, value: number) {
  let curr = head @@walk
  for (let i = 0; i < position; i++) curr = curr.next! @@walk
  const node = new ListNode(value) @@create
  node.next = curr.next @@link-new
  curr.next = node @@link-prev
}`,
    py: `
def insert_after(head, position, value):
    curr = head @@walk
    for _ in range(position):
        curr = curr.next @@walk
    node = ListNode(value) @@create
    node.next = curr.next @@link-new
    curr.next = node @@link-prev`,
  }),
  delete: marked<LLLine>({
    ts: `
function deleteAt(head: ListNode, position: number) {
  if (position === 0) return head.next @@move-head
  let prev = head @@walk
  for (let i = 0; i < position - 1; i++) prev = prev.next! @@walk
  prev.next = prev.next!.next @@unlink
  return head @@done
}`,
    py: `
def delete_at(head, position):
    if position == 0:
        return head.next @@move-head
    prev = head @@walk
    for _ in range(position - 1):
        prev = prev.next @@walk
    prev.next = prev.next.next @@unlink
    return head @@done`,
  }),
  reverse: marked<LLLine>({
    ts: `
function reverse(head: ListNode | null) {
  let prev: ListNode | null = null @@walk
  let curr = head @@walk
  while (curr !== null) {
    const next = curr.next @@save-next
    curr.next = prev @@flip
    prev = curr @@advance
    curr = next @@advance
  }
  return prev @@set-head
}`,
    py: `
def reverse(head):
    prev = None @@walk
    curr = head @@walk
    while curr is not None:
        nxt = curr.next @@save-next
        curr.next = prev @@flip
        prev = curr @@advance
        curr = nxt @@advance
    return prev @@set-head`,
  }),
}
