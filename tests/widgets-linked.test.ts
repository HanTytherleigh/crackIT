import { describe, expect, it } from 'vitest'
import { fromValues, llFrames, toValues } from '../src/widgets/linkedList'

const run = (values: number[], op: Parameters<typeof llFrames>[1]) => toValues(llFrames(fromValues(values), op).at(-1)!.state)

describe('linked list frames', () => {
  it('inserts at the head', () => expect(run([1, 2, 3], { kind: 'insert-head', value: 9 })).toEqual([9, 1, 2, 3]))
  it('inserts after a position', () => {
    expect(run([1, 2, 3], { kind: 'insert-after', position: 0, value: 9 })).toEqual([1, 9, 2, 3])
    expect(run([1, 2, 3], { kind: 'insert-after', position: 2, value: 9 })).toEqual([1, 2, 3, 9])
  })
  it('deletes by position', () => {
    expect(run([1, 2, 3], { kind: 'delete', position: 0 })).toEqual([2, 3])
    expect(run([1, 2, 3], { kind: 'delete', position: 1 })).toEqual([1, 3])
    expect(run([1, 2, 3], { kind: 'delete', position: 2 })).toEqual([1, 2])
  })
  it('reverses', () => {
    expect(run([1, 2, 3, 4, 5], { kind: 'reverse' })).toEqual([5, 4, 3, 2, 1])
    expect(run([7], { kind: 'reverse' })).toEqual([7])
  })
  it('never leaves the list broken mid-reverse: every node stays reachable from head or prev', () => {
    const frames = llFrames(fromValues([1, 2, 3, 4]), { kind: 'reverse' })
    for (const f of frames) {
      const reachable = new Set<number>()
      for (const start of [f.state.head, f.pointers.prev ?? null, f.pointers.curr ?? null, f.pointers.next ?? null]) {
        let c = start
        while (c !== null && c !== undefined && !reachable.has(c)) {
          reachable.add(c)
          c = f.state.nodes.find((n) => n.id === c)!.next
        }
      }
      expect(reachable.size).toBe(4)
    }
  })
})
