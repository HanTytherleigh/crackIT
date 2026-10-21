// Draws a binary tree whose nodes are placed by level-order slot (0 = root, 2i+1 / 2i+2 = children).
// Used by the traversal and heap widgets.

export interface SlotNode {
  slot: number
  label: string | number
  className?: string
}

const W = 340
const ROW = 46
const R = 15

export function slotPosition(slot: number): { x: number; y: number } {
  const level = Math.floor(Math.log2(slot + 1))
  const indexInLevel = slot - (2 ** level - 1)
  return { x: ((indexInLevel + 0.5) / 2 ** level) * W, y: 22 + level * ROW }
}

export function TreeSvg({ nodes, label }: { nodes: SlotNode[]; label: string }) {
  const bySlot = new Map(nodes.map((n) => [n.slot, n]))
  const levels = nodes.length ? Math.floor(Math.log2(Math.max(...nodes.map((n) => n.slot)) + 1)) + 1 : 1
  return (
    <svg className="plot" viewBox={`0 0 ${W} ${levels * ROW + 4}`} role="img" aria-label={label}>
      {nodes.map((n) => {
        if (n.slot === 0) return null
        const parent = Math.floor((n.slot - 1) / 2)
        if (!bySlot.has(parent)) return null
        const a = slotPosition(parent)
        const b = slotPosition(n.slot)
        return <line key={`e${n.slot}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} className="tree-edge" />
      })}
      {nodes.map((n) => {
        const at = slotPosition(n.slot)
        return (
          <g key={n.slot} className={`tree-node ${n.className ?? ''}`}>
            <circle cx={at.x} cy={at.y} r={R} />
            <text x={at.x} y={at.y + 4} textAnchor="middle">{n.label}</text>
          </g>
        )
      })}
    </svg>
  )
}
