// Runs every topic's hands-on reference answer, in both TypeScript and Python, against the
// same cases. A wrong reference answer would teach the wrong thing, so the build checks them.
import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { transformSync } from 'esbuild'
import { describe, expect, it } from 'vitest'

type Harness = { ts: string; py: string; expected: unknown }

const jsListNode = `class ListNode { constructor(value, next = null) { this.value = value; this.next = next } }
const fromList = (xs) => xs.reduceRight((next, v) => new ListNode(v, next), null)
const toList = (n) => { const out = []; while (n) { out.push(n.value); n = n.next } return out }`
const pyListNode = `class ListNode:
    def __init__(self, value, next=None):
        self.value = value
        self.next = next
def from_list(xs):
    head = None
    for v in reversed(xs):
        head = ListNode(v, head)
    return head
def to_list(n):
    out = []
    while n:
        out.append(n.value)
        n = n.next
    return out`
const jsTreeNode = `class TreeNode { constructor(value, left = null, right = null) { this.value = value; this.left = left; this.right = right } }
const T = (v, l = null, r = null) => new TreeNode(v, l, r)`
const pyTreeNode = `class TreeNode:
    def __init__(self, value, left=None, right=None):
        self.value = value
        self.left = left
        self.right = right
def T(v, l=None, r=None):
    return TreeNode(v, l, r)`

const harnesses: Record<string, Harness> = {
  'big-o': {
    ts: `return [countZeroPairs([1, -1, 2, -2, 0, 0]), countZeroPairs([1, 2, 3]), countZeroPairs([])]`,
    py: `result = [count_zero_pairs([1, -1, 2, -2, 0, 0]), count_zero_pairs([1, 2, 3]), count_zero_pairs([])]`,
    expected: [3, 0, 0],
  },
  'arrays-strings': {
    ts: `return [pairWithSum([1, 3, 4, 6, 9], 13), pairWithSum([1, 2], 5), pairWithSum([2, 2], 4)]`,
    py: `result = [pair_with_sum([1, 3, 4, 6, 9], 13), pair_with_sum([1, 2], 5), pair_with_sum([2, 2], 4)]`,
    expected: [[2, 4], null, [0, 1]],
  },
  'hash-maps-sets': {
    ts: `return [twoSum([3, 2, 4], 6), twoSum([3], 6), twoSum([3, 3], 6)]`,
    py: `result = [two_sum([3, 2, 4], 6), two_sum([3], 6), two_sum([3, 3], 6)]`,
    expected: [[1, 2], null, [0, 1]],
  },
  'linked-lists': {
    ts: `${jsListNode}\nreturn [toList(reverse(fromList([1, 2, 3, 4, 5]))), reverse(null), toList(reverse(fromList([7])))]`,
    py: `${pyListNode}\nresult = [to_list(reverse(from_list([1, 2, 3, 4, 5]))), reverse(None), to_list(reverse(from_list([7])))]`,
    expected: [[5, 4, 3, 2, 1], null, [7]],
  },
  'stacks-queues': {
    ts: `const q = new TwoStackQueue(); const out = []
q.enqueue(1); q.enqueue(2); q.enqueue(3); out.push(q.dequeue()); q.enqueue(4)
out.push(q.dequeue(), q.dequeue(), q.dequeue(), q.dequeue() ?? null)
return out`,
    py: `q = TwoStackQueue(); out = []
q.enqueue(1); q.enqueue(2); q.enqueue(3); out.append(q.dequeue()); q.enqueue(4)
out += [q.dequeue(), q.dequeue(), q.dequeue(), q.dequeue()]
result = out`,
    expected: [1, 2, 3, 4, null],
  },
  recursion: {
    ts: `return [0, 1, 2, 3, 4, 5, 6, 30].map((n) => climbWays(n))`,
    py: `result = [climb_ways(n) for n in [0, 1, 2, 3, 4, 5, 6, 30]]`,
    expected: [1, 1, 2, 3, 5, 8, 13, 1346269],
  },
  'trees-bfs-dfs': {
    ts: `${jsTreeNode}\nreturn [isValidBST(T(8, T(3, T(1), T(6)), T(10))), isValidBST(T(8, T(3, null, T(9)), T(10))), isValidBST(T(5, T(5))), isValidBST(null)]`,
    py: `${pyTreeNode}\nresult = [is_valid_bst(T(8, T(3, T(1), T(6)), T(10))), is_valid_bst(T(8, T(3, None, T(9)), T(10))), is_valid_bst(T(5, T(5))), is_valid_bst(None)]`,
    expected: [true, false, false, true],
  },
  heaps: {
    ts: `const pts = [[3, 3], [5, -1], [-2, 4], [1, 1], [0, 2], [-1, -1], [6, 0]]
const d = (p) => p[0] * p[0] + p[1] * p[1]
return [0, 1, 3, 7].map((k) => kClosest(pts, k).map(d).sort((a, b) => a - b))`,
    py: `pts = [[3, 3], [5, -1], [-2, 4], [1, 1], [0, 2], [-1, -1], [6, 0]]
d = lambda p: p[0] * p[0] + p[1] * p[1]
result = [sorted(d(p) for p in k_closest(pts, k)) for k in [0, 1, 3, 7]]`,
    expected: [[], [2], [2, 2, 4], [2, 2, 4, 18, 20, 26, 36]],
  },
  graphs: {
    ts: `const g = (rows) => rows.map((r) => [...r])
return [
  numIslands(g(['11000', '11000', '00100', '00011'])),
  numIslands(g(['111', '010', '111'])),
  numIslands(g(['000'])),
  numIslands([]),
  numIslands(g(['101', '010', '101'])),
]`,
    py: `g = lambda rows: [list(r) for r in rows]
result = [
    num_islands(g(['11000', '11000', '00100', '00011'])),
    num_islands(g(['111', '010', '111'])),
    num_islands(g(['000'])),
    num_islands([]),
    num_islands(g(['101', '010', '101'])),
]`,
    expected: [3, 1, 0, 0, 5],
  },
}

const topics = readdirSync('content/dsa').map((f) => JSON.parse(readFileSync(`content/dsa/${f}`, 'utf8')))
const work = mkdtempSync(join(tmpdir(), 'crackit-ref-'))

describe('hands-on reference answers', () => {
  it('has a harness for every topic', () => {
    expect(topics.map((t) => t.id).filter((id) => !harnesses[id])).toEqual([])
  })

  for (const topic of topics) {
    const h = harnesses[topic.id]
    if (!h) continue

    it(`${topic.id}: TypeScript reference`, () => {
      const js = transformSync(topic.handsOn.reference.ts, { loader: 'ts' }).code
      const run = new Function(`${js}\n${h.ts}`)
      expect(JSON.parse(JSON.stringify(run()))).toEqual(h.expected)
    })

    it(`${topic.id}: Python reference`, () => {
      const file = join(work, `${topic.id}.py`)
      writeFileSync(file, `import json\n${topic.handsOn.reference.py}\n\n${h.py}\nprint(json.dumps(result))\n`)
      const out = execFileSync('python3', ['-I', file], { encoding: 'utf8' })
      expect(JSON.parse(out)).toEqual(h.expected)
    })
  }
})
