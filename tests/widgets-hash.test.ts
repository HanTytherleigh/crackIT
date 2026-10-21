import { describe, expect, it } from 'vitest'
import { emptyTable, insertFrames, loadFactor, lookupFrames, toyHash, type Table } from '../src/widgets/hashTable'

const insertAll = (t: Table, keys: string[]) => keys.reduce((acc, k) => insertFrames(acc, k).at(-1)!.table, t)

describe('toy hash table', () => {
  it('hashes by adding character codes', () => {
    expect(toyHash('cat')).toBe(99 + 97 + 116)
    expect(toyHash('cat') % 8).toBe(0)
    expect(toyHash('act')).toBe(toyHash('cat')) // anagrams always collide with this toy hash
  })

  for (const mode of ['chaining', 'probing'] as const) {
    it(`${mode}: finds every inserted key and misses others`, () => {
      const keys = ['cat', 'act', 'dog', 'fig', 'kiwi', 'pear', 'plum', 'lime', 'date', 'yam']
      const t = insertAll(emptyTable(mode), keys)
      expect(t.size).toBe(keys.length)
      for (const k of keys) expect(lookupFrames(t, k).at(-1)!.outcome).toBe('found')
      for (const k of ['cow', 'tac', 'zzz']) expect(lookupFrames(t, k).at(-1)!.outcome).toBe('missing')
      expect(loadFactor(t)).toBeLessThanOrEqual(0.75)
    })

    it(`${mode}: does not store duplicates`, () => {
      const t = insertAll(emptyTable(mode), ['cat', 'cat'])
      expect(t.size).toBe(1)
      expect(insertFrames(t, 'cat').at(-1)!.outcome).toBe('exists')
    })
  }

  it('doubles once the load factor passes 0.75', () => {
    const keys = ['a', 'b', 'c', 'd', 'e', 'f']
    const t6 = insertAll(emptyTable('chaining'), keys)
    expect(t6.chains).toHaveLength(8) // 6/8 = 0.75 is not over the limit
    const frames = insertFrames(t6, 'g')
    expect(frames.some((f) => f.line === 'resize')).toBe(true)
    expect(frames.at(-1)!.table.chains).toHaveLength(16)
    expect(frames.at(-1)!.table.size).toBe(7)
  })

  it('probes past taken slots in order', () => {
    // 'c' (99) and 'k' (107) both land on 3 in 8 slots; 'd' (100) lands on 4.
    const t = insertAll(emptyTable('probing'), ['c', 'k', 'd'])
    expect(t.slots[3]).toBe('c')
    expect(t.slots[4]).toBe('k')
    expect(t.slots[5]).toBe('d')
  })
})
