import { describe, expect, it } from 'vitest'
import { traversalFrames, traversalSnippets, treeFromLevelOrder } from '../src/widgets/treeTraversal'

// The lesson's tree:
//         8
//       /   \
//      3     10
//     / \      \
//    1   6      14
//       / \     /
//      4   7   13
const TREE = [8, 3, 10, 1, 6, null, 14, null, null, 4, 7, null, null, 13]
const nodes = treeFromLevelOrder(TREE)
const order = (o: Parameters<typeof traversalFrames>[1]) => traversalFrames(nodes, o).at(-1)!.visited.map((id) => nodes[id]!.value)

describe('tree traversals', () => {
  it('builds the tree from level order', () => {
    expect(nodes).toHaveLength(9)
    const thirteen = nodes.find((n) => n.value === 13)!
    expect(nodes.find((n) => n.value === 14)!.left).toBe(thirteen.id)
  })
  it('pre-order', () => expect(order('pre')).toEqual([8, 3, 1, 6, 4, 7, 10, 14, 13]))
  it('in-order is sorted for a BST', () => expect(order('in')).toEqual([1, 3, 4, 6, 7, 8, 10, 13, 14]))
  it('post-order', () => expect(order('post')).toEqual([1, 4, 7, 6, 3, 13, 14, 10, 8]))
  it('level order', () => expect(order('bfs')).toEqual([8, 3, 10, 1, 6, 14, 4, 7, 13]))
  it('DFS stack depth never exceeds the number of levels', () => {
    expect(Math.max(...traversalFrames(nodes, 'pre').map((f) => f.pending.length))).toBe(4)
  })
  it('places the visit line differently in each DFS snippet', () => {
    expect(traversalSnippets.pre.lines.ts.visit).toEqual([3])
    expect(traversalSnippets.in.lines.ts.visit).toEqual([4])
    expect(traversalSnippets.post.lines.ts.visit).toEqual([5])
  })
})
