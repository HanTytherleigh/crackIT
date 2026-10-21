import { describe, expect, it } from 'vitest'
import { presetGraph, searchFrames, type Graph } from '../src/widgets/graph'

const g = presetGraph()
const id = (l: string) => g.nodes.find((n) => n.label === l)!.id
const labels = (ids: number[]) => ids.map((i) => g.nodes[i]!.label).join('')

describe('graph search', () => {
  it('BFS visits level by level and records distances', () => {
    const last = searchFrames(g, 'bfs', id('A')).at(-1)!
    expect(labels(last.visited)).toBe('ABCDEFG')
    expect(last.dist[id('F')]).toBe(3)
    expect(last.dist[id('G')]).toBe(4)
  })

  it('DFS goes deep first', () => {
    const last = searchFrames(g, 'dfs', id('A')).at(-1)!
    expect(labels(last.visited)).toBe('ABDCEFG')
  })

  it('finds a shortest path with BFS', () => {
    const last = searchFrames(g, 'path', id('A'), id('G')).at(-1)!
    expect(last.line).toBe('found')
    expect(last.path!.length - 1).toBe(4)
    expect(labels(last.path!)).toBe('ABDFG')
  })

  it('reports an unreachable target', () => {
    const islands: Graph = { nodes: [...g.nodes, { id: 7, label: 'H', x: 0, y: 0 }], edges: g.edges }
    expect(searchFrames(islands, 'path', id('A'), 7).at(-1)!.line).toBe('unreachable')
  })

  it('visits every node once in both searches', () => {
    for (const algo of ['bfs', 'dfs'] as const) {
      const v = searchFrames(g, algo, id('D')).at(-1)!.visited
      expect(new Set(v).size).toBe(v.length)
      expect(v).toHaveLength(7)
    }
  })
})
