// Precomputes each cell move for array operations, so shifting costs can be stepped through.

import { marked } from './snippet'

export type Cell = number | null
export type ArrayOp =
  | { kind: 'read'; index: number }
  | { kind: 'insert'; index: number; value: number }
  | { kind: 'delete'; index: number }
  | { kind: 'append'; value: number }

export type OpLine = 'read' | 'shift' | 'place' | 'shrink' | 'resize' | 'copy' | 'append' | 'done'

export interface ArrayFrame {
  cells: Cell[]
  length: number
  /** Cells to highlight in this frame. */
  active: number[]
  /** Element moves so far: the real cost of the operation. */
  moves: number
  line: OpLine
  say: string
  /** True on the frame where a bigger block has just been allocated. */
  resized?: boolean
}

export function arrayOpFrames(start: Cell[], length: number, op: ArrayOp): ArrayFrame[] {
  let cells = [...start]
  let moves = 0
  const frames: ArrayFrame[] = []
  const push = (f: Omit<ArrayFrame, 'cells' | 'length' | 'moves'> & { length?: number }) =>
    frames.push({ cells: [...cells], length: f.length ?? length, moves, ...f })

  const growIfFull = () => {
    if (length < cells.length) return
    cells = Array<Cell>(cells.length * 2).fill(null)
    push({ active: [], line: 'resize', resized: true, say: `Full. Allocate a new block twice the size (${cells.length} slots) and copy everything across.` })
    for (let i = 0; i < length; i++) {
      cells[i] = start[i]!
      moves++
      push({ active: [i], line: 'copy', say: `Copy ${start[i]} into slot ${i} of the new block.` })
    }
  }

  switch (op.kind) {
    case 'read':
      push({ active: [op.index], line: 'read', say: `Jump straight to slot ${op.index}: address = start + ${op.index} × item size. One step, whatever the length.` })
      break
    case 'append':
      push({ active: [], line: 'append', say: `Append ${op.value}.` })
      growIfFull()
      cells[length] = op.value
      push({ active: [length], line: 'append', length: length + 1, say: `Write ${op.value} into the first free slot (${length}). Nothing else moves.` })
      break
    case 'insert': {
      push({ active: [op.index], line: 'shift', say: `Insert ${op.value} at index ${op.index}: everything from ${op.index} onwards must move one slot right first.` })
      growIfFull()
      for (let j = length - 1; j >= op.index; j--) {
        cells[j + 1] = cells[j]!
        cells[j] = null
        moves++
        push({ active: [j + 1], line: 'shift', say: `Shift ${cells[j + 1]} from slot ${j} to slot ${j + 1}.` })
      }
      cells[op.index] = op.value
      push({ active: [op.index], line: 'place', length: length + 1, say: `Place ${op.value} in slot ${op.index}. That took ${moves} ${moves === 1 ? 'move' : 'moves'}.` })
      break
    }
    case 'delete': {
      const removed = cells[op.index]
      cells[op.index] = null
      push({ active: [op.index], line: 'shift', say: `Delete ${removed} at index ${op.index}: the items after it must close the gap.` })
      for (let j = op.index; j < length - 1; j++) {
        cells[j] = cells[j + 1]!
        cells[j + 1] = null
        moves++
        push({ active: [j], line: 'shift', say: `Shift ${cells[j]} from slot ${j + 1} to slot ${j}.` })
      }
      push({ active: [], line: 'shrink', length: length - 1, say: `Done. Deleting index ${op.index} took ${moves} ${moves === 1 ? 'move' : 'moves'}.` })
      break
    }
  }
  return frames
}

export const arraySnippets = {
  read: marked<OpLine>({
    ts: `
function read(arr: number[], i: number): number {
  return arr[i] @@read
}`,
    py: `
def read(arr, i):
    return arr[i] @@read`,
  }),
  insert: marked<OpLine>({
    ts: `
function insertAt(arr: number[], length: number, i: number, value: number) {
  for (let j = length - 1; j >= i; j--) {
    arr[j + 1] = arr[j] @@shift
  }
  arr[i] = value @@place
}`,
    py: `
def insert_at(arr, length, i, value):
    for j in range(length - 1, i - 1, -1):
        arr[j + 1] = arr[j] @@shift
    arr[i] = value @@place`,
  }),
  delete: marked<OpLine>({
    ts: `
function deleteAt(arr: number[], length: number, i: number) {
  for (let j = i; j < length - 1; j++) {
    arr[j] = arr[j + 1] @@shift
  }
  return length - 1 @@shrink
}`,
    py: `
def delete_at(arr, length, i):
    for j in range(i, length - 1):
        arr[j] = arr[j + 1] @@shift
    return length - 1 @@shrink`,
  }),
  append: marked<OpLine>({
    ts: `
function append(arr: number[], length: number, value: number) {
  if (length === arr.length) { @@resize
    const bigger = new Array(arr.length * 2) @@resize
    for (let i = 0; i < length; i++) bigger[i] = arr[i] @@copy
    arr = bigger
  }
  arr[length] = value @@append
}`,
    py: `
def append(arr, length, value):
    if length == len(arr): @@resize
        bigger = [None] * (len(arr) * 2) @@resize
        for i in range(length):
            bigger[i] = arr[i] @@copy
        arr = bigger
    arr[length] = value @@append`,
  }),
}
