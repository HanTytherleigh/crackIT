// A toy hash table that records every step of insert and lookup, for both
// separate chaining and linear probing, including resizing past the load-factor limit.

import { marked } from './snippet'

export type Mode = 'chaining' | 'probing'
export const MAX_LOAD = 0.75

/** Deliberately simple: add up the character codes. Real hash functions mix the bits far better. */
export function toyHash(key: string): number {
  let h = 0
  for (const ch of key) h += ch.codePointAt(0)!
  return h
}

export type Table = { mode: Mode; chains: string[][]; slots: (string | null)[]; size: number }

export function emptyTable(mode: Mode, buckets = 8): Table {
  return { mode, chains: Array.from({ length: buckets }, () => []), slots: Array(buckets).fill(null), size: 0 }
}

export const bucketCount = (t: Table) => (t.mode === 'chaining' ? t.chains.length : t.slots.length)
export const loadFactor = (t: Table) => t.size / bucketCount(t)

export type HashLine = 'hash' | 'walk' | 'compare' | 'place' | 'found' | 'missing' | 'resize' | 'rehash' | 'exists'

export interface HashFrame {
  table: Table
  /** Bucket or slot being looked at. */
  active?: number
  /** Position within a chain, when chaining. */
  chainPos?: number
  line: HashLine
  say: string
  probes: number
  outcome?: 'found' | 'missing' | 'placed' | 'exists'
}

const clone = (t: Table): Table => ({ mode: t.mode, chains: t.chains.map((c) => [...c]), slots: [...t.slots], size: t.size })

/** Places a key without recording frames (used when rehashing). Returns the slot used. */
function placeQuietly(t: Table, key: string): number {
  const m = bucketCount(t)
  let i = toyHash(key) % m
  if (t.mode === 'chaining') {
    t.chains[i]!.push(key)
  } else {
    while (t.slots[i] !== null) i = (i + 1) % m
    t.slots[i] = key
  }
  t.size++
  return i
}

export function insertFrames(start: Table, key: string): HashFrame[] {
  let t = clone(start)
  const frames: HashFrame[] = []
  let probes = 0
  const m = bucketCount(t)
  const h = toyHash(key)
  let i = h % m
  const push = (f: Omit<HashFrame, 'table' | 'probes'>) => frames.push({ table: clone(t), probes, ...f })

  push({ active: i, line: 'hash', say: `hash("${key}") = ${[...key].map((c) => c.codePointAt(0)).join(' + ')} = ${h}. ${h} mod ${m} = ${i}, so bucket ${i}.` })

  if (t.mode === 'chaining') {
    const chain = t.chains[i]!
    for (let p = 0; p < chain.length; p++) {
      probes++
      if (chain[p] === key) {
        push({ active: i, chainPos: p, line: 'exists', outcome: 'exists', say: `"${key}" is already in bucket ${i}. A map would update its value; a set does nothing.` })
        return frames
      }
      push({ active: i, chainPos: p, line: 'compare', say: `Bucket ${i} already holds "${chain[p]}": a collision. Not our key, keep walking the chain.` })
    }
    chain.push(key)
    t.size++
    push({ active: i, chainPos: chain.length - 1, line: 'place', outcome: 'placed', say: `Add "${key}" to the end of bucket ${i}'s chain.` })
  } else {
    while (t.slots[i] !== null) {
      probes++
      if (t.slots[i] === key) {
        push({ active: i, line: 'exists', outcome: 'exists', say: `"${key}" is already in slot ${i}.` })
        return frames
      }
      push({ active: i, line: 'walk', say: `Slot ${i} is taken by "${t.slots[i]}": a collision. Probe the next slot, ${(i + 1) % m}.` })
      i = (i + 1) % m
    }
    t.slots[i] = key
    t.size++
    push({ active: i, line: 'place', outcome: 'placed', say: `Slot ${i} is free. Put "${key}" there${probes ? ` after ${probes} ${probes === 1 ? 'probe' : 'probes'}` : ''}.` })
  }

  if (loadFactor(t) > MAX_LOAD) {
    const old = t
    push({ line: 'resize', say: `Load factor is now ${t.size}/${m} = ${loadFactor(t).toFixed(2)}, over ${MAX_LOAD}. Double to ${m * 2} buckets and rehash every key: positions depend on the bucket count.` })
    t = emptyTable(t.mode, m * 2)
    const keys = old.mode === 'chaining' ? old.chains.flat() : old.slots.filter((k): k is string => k !== null)
    for (const k of keys) {
      const at = placeQuietly(t, k)
      push({ active: at, line: 'rehash', say: `"${k}": ${toyHash(k)} mod ${m * 2} = ${toyHash(k) % (m * 2)}${at !== toyHash(k) % (m * 2) ? `, probed on to ${at}` : ''}.` })
    }
  }
  return frames
}

export function lookupFrames(start: Table, key: string): HashFrame[] {
  const t = clone(start)
  const frames: HashFrame[] = []
  let probes = 0
  const m = bucketCount(t)
  const h = toyHash(key)
  let i = h % m
  const push = (f: Omit<HashFrame, 'table' | 'probes'>) => frames.push({ table: t, probes, ...f })
  push({ active: i, line: 'hash', say: `hash("${key}") = ${h}. ${h} mod ${m} = ${i}: only bucket ${i} can hold it.` })

  if (t.mode === 'chaining') {
    const chain = t.chains[i]!
    for (let p = 0; p < chain.length; p++) {
      probes++
      if (chain[p] === key) {
        push({ active: i, chainPos: p, line: 'found', outcome: 'found', say: `Found "${key}" after ${probes} ${probes === 1 ? 'comparison' : 'comparisons'}, without looking at any other bucket.` })
        return frames
      }
      push({ active: i, chainPos: p, line: 'compare', say: `"${chain[p]}" is not "${key}". Next in the chain.` })
    }
    push({ active: i, line: 'missing', outcome: 'missing', say: `End of bucket ${i}'s chain: "${key}" is not in the table.` })
  } else {
    for (let n = 0; n < m && t.slots[i] !== null; n++) {
      probes++
      if (t.slots[i] === key) {
        push({ active: i, line: 'found', outcome: 'found', say: `Found "${key}" in slot ${i} after ${probes} ${probes === 1 ? 'probe' : 'probes'}.` })
        return frames
      }
      push({ active: i, line: 'walk', say: `Slot ${i} holds "${t.slots[i]}". Keep probing.` })
      i = (i + 1) % m
    }
    push({ active: i, line: 'missing', outcome: 'missing', say: `Hit an empty slot: "${key}" is not in the table.` })
  }
  return frames
}

export const hashSnippets = {
  chaining: marked<HashLine>({
    ts: `
function put(buckets: string[][], key: string) {
  const i = hash(key) % buckets.length @@hash
  for (const k of buckets[i]) { @@compare @@walk
    if (k === key) return @@exists @@found
  }
  buckets[i].push(key) @@place
  if (++size / buckets.length > 0.75) resize() @@resize @@rehash
}`,
    py: `
def put(buckets, key):
    i = hash(key) % len(buckets) @@hash
    for k in buckets[i]: @@compare @@walk
        if k == key: @@exists @@found
            return @@exists @@found
    buckets[i].append(key) @@place
    if size / len(buckets) > 0.75: @@resize @@rehash
        resize() @@resize @@rehash`,
  }),
  probing: marked<HashLine>({
    ts: `
function put(slots: (string | null)[], key: string) {
  let i = hash(key) % slots.length @@hash
  while (slots[i] !== null) { @@walk @@compare
    if (slots[i] === key) return @@exists @@found
    i = (i + 1) % slots.length @@walk
  }
  slots[i] = key @@place
  if (++size / slots.length > 0.75) resize() @@resize @@rehash
}`,
    py: `
def put(slots, key):
    i = hash(key) % len(slots) @@hash
    while slots[i] is not None: @@walk @@compare
        if slots[i] == key: @@exists @@found
            return @@exists @@found
        i = (i + 1) % len(slots) @@walk
    slots[i] = key @@place
    if size / len(slots) > 0.75: @@resize @@rehash
        resize() @@resize @@rehash`,
  }),
  chainingGet: marked<HashLine>({
    ts: `
function has(buckets: string[][], key: string): boolean {
  const i = hash(key) % buckets.length @@hash
  for (const k of buckets[i]) { @@compare
    if (k === key) return true @@found
  }
  return false @@missing
}`,
    py: `
def has(buckets, key):
    i = hash(key) % len(buckets) @@hash
    for k in buckets[i]: @@compare
        if k == key: @@found
            return True @@found
    return False @@missing`,
  }),
  probingGet: marked<HashLine>({
    ts: `
function has(slots: (string | null)[], key: string): boolean {
  let i = hash(key) % slots.length @@hash
  while (slots[i] !== null) {
    if (slots[i] === key) return true @@found
    i = (i + 1) % slots.length @@walk
  }
  return false @@missing
}`,
    py: `
def has(slots, key):
    i = hash(key) % len(slots) @@hash
    while slots[i] is not None:
        if slots[i] == key: @@found
            return True @@found
        i = (i + 1) % len(slots) @@walk
    return False @@missing`,
  }),
}
