import { useMemo, useState } from 'react'
import { CodeBlock } from '../components/CodeBlock'
import { StepControls, useFrames, WidgetFrame } from './controls'
import { fromValues, llFrames, llSnippets, order, toValues, type LLFrame, type LLOp, type ListState, type NodeId } from './linkedList'

const START = [3, 7, 1, 9]
const MAX_NODES = 7
type Kind = LLOp['kind']
const kindLabel: Record<Kind, string> = {
  'insert-head': 'Insert at head',
  'insert-after': 'Insert after position',
  delete: 'Delete at position',
  reverse: 'Reverse',
}

// SVG geometry
const W = 340
const ROW_Y = 48
const FLOAT_Y = 118
const BOX_W = 40
const BOX_H = 28

export default function LinkedList() {
  const [base, setBase] = useState<ListState>(() => fromValues(START))
  const [kind, setKind] = useState<Kind>('reverse')
  const [position, setPosition] = useState(0)
  const [run, setRun] = useState<{ id: number; op: LLOp; from: ListState; frames: LLFrame[] } | null>(null)

  const frames = run?.frames ?? []
  const p = useFrames(frames.length || 1, run?.id ?? 0)
  const frame = frames[p.index]
  const state = frame?.state ?? base
  const length = toValues(base).length

  // Lay nodes out in the order they had when the operation started, so arrows visibly flip.
  const layout = useMemo(() => {
    const from = run?.from ?? base
    const ids = order(from)
    const extra = (run?.frames.at(-1)?.state.nodes ?? []).map((n) => n.id).filter((id) => !ids.includes(id))
    const slots = Math.max(ids.length + extra.length, 4)
    const slotW = W / slots
    const pos = new Map<NodeId, { x: number; y: number }>()
    ids.forEach((id, i) => pos.set(id, { x: slotW * i + (slotW - BOX_W) / 2, y: ROW_Y }))
    // A new node floats below the slot it is heading for.
    extra.forEach((id) => {
      const op = run!.op
      const at = op.kind === 'insert-after' ? op.position + 0.5 : -0.5
      pos.set(id, { x: Math.max(2, slotW * (at + 0.5) + (slotW - BOX_W) / 2), y: FLOAT_Y })
    })
    return { pos, slotW }
  }, [run, base])

  function start() {
    const from = frames.length ? frames.at(-1)!.state : base
    setBase(from)
    const n = toValues(from).length
    const op: LLOp =
      kind === 'reverse'
        ? { kind }
        : kind === 'delete'
          ? { kind, position: Math.min(position, n - 1) }
          : kind === 'insert-after'
            ? { kind, position: Math.min(position, n - 1), value: 10 + ((n * 13) % 80) }
            : { kind, value: 10 + ((n * 13) % 80) }
    setRun({ id: (run?.id ?? 0) + 1, op, from, frames: llFrames(from, op) })
  }

  const canRun = kind === 'reverse' ? length > 0 : kind === 'delete' ? length > 1 : length < MAX_NODES
  const snippet = llSnippets[run?.op.kind ?? kind]
  const labels = new Map<NodeId, string[]>()
  for (const [name, id] of Object.entries(frame?.pointers ?? {})) if (id !== null && id !== undefined) labels.set(id, [...(labels.get(id) ?? []), name])
  const centre = (id: NodeId) => layout.pos.get(id)!

  return (
    <WidgetFrame title="Linked list">
      <div className="op-form">
        <label className="small inline-field">
          <span className="visually-hidden">Operation</span>
          <select className="select" value={kind} onChange={(e) => setKind(e.target.value as Kind)} aria-label="Operation">
            {(Object.keys(kindLabel) as Kind[]).map((k) => <option key={k} value={k}>{kindLabel[k]}</option>)}
          </select>
        </label>
        {(kind === 'insert-after' || kind === 'delete') && (
          <label className="small inline-field">
            position
            <select className="select" value={Math.min(position, length - 1)} onChange={(e) => setPosition(Number(e.target.value))}>
              {Array.from({ length }, (_, i) => <option key={i} value={i}>{i}</option>)}
            </select>
          </label>
        )}
        <button type="button" className="btn btn-primary" disabled={!canRun} onClick={start}>Run</button>
      </div>

      <svg className="plot ll-svg" viewBox={`0 0 ${W} 160`} role="img" aria-label={`List: ${toValues(state).join(' → ') || 'empty'}${frame?.floating ? ', plus one new node not yet linked' : ''}`}>
        <defs>
          <marker id="ll-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M0,0 L8,4 L0,8 z" className="ll-arrowhead" />
          </marker>
        </defs>
        {state.nodes.map((n) => {
          if (n.next === null || !layout.pos.has(n.id) || !layout.pos.has(n.next)) return null
          const a = centre(n.id)
          const b = centre(n.next)
          const x1 = a.x + BOX_W - 6
          const y1 = a.y + BOX_H / 2
          let d: string
          if (Math.abs(a.y - b.y) < 1 && b.x > a.x) d = `M${x1},${y1} L${b.x - 2},${b.y + BOX_H / 2}`
          // Backward arrows (after flipping) arc over the row, clear of the labels underneath.
          else if (Math.abs(a.y - b.y) < 1) d = `M${x1},${a.y} C${x1},${a.y - 34} ${b.x + BOX_W / 2},${b.y - 34} ${b.x + BOX_W / 2},${b.y - 2}`
          else d = `M${x1},${y1} L${b.x + BOX_W / 2},${b.y + (b.y > a.y ? -2 : BOX_H + 2)}`
          return <path key={`e${n.id}`} d={d} className={`ll-edge${frame?.changed === n.id ? ' is-changed' : ''}`} markerEnd="url(#ll-arrow)" />
        })}
        {state.nodes.map((n) => {
          const at = layout.pos.get(n.id)
          if (!at) return null
          const tags = [...(state.head === n.id ? ['head'] : []), ...(labels.get(n.id) ?? [])]
          return (
            <g key={n.id} className={`ll-node${tags.includes('curr') ? ' is-curr' : ''}${frame?.floating === n.id ? ' is-floating' : ''}`}>
              <rect x={at.x} y={at.y} width={BOX_W} height={BOX_H} rx={6} />
              <line x1={at.x + BOX_W - 12} y1={at.y} x2={at.x + BOX_W - 12} y2={at.y + BOX_H} className="ll-divider" />
              {n.next === null && <line x1={at.x + BOX_W - 12} y1={at.y + BOX_H} x2={at.x + BOX_W} y2={at.y} className="ll-null" />}
              <text x={at.x + (BOX_W - 12) / 2} y={at.y + BOX_H / 2 + 5} textAnchor="middle" className="ll-value">{n.value}</text>
              {tags.map((t, i) => (
                <text key={t} x={at.x + BOX_W / 2} y={at.y + BOX_H + 14 + i * 12} textAnchor="middle" className={`ll-label ll-${t}`}>{t}</text>
              ))}
            </g>
          )
        })}
        {frame && 'prev' in frame.pointers && frame.pointers.prev === null && (
          <text x={4} y={ROW_Y + BOX_H + 14} className="ll-label ll-prev">prev = null</text>
        )}
      </svg>

      <StepControls
        onReset={() => {
          p.setPlaying(false)
          setRun(null)
          setBase(fromValues(START))
        }}
        onBack={() => p.setIndex(Math.max(0, p.index - 1))}
        onForward={() => p.setIndex(Math.min(frames.length - 1, p.index + 1))}
        canBack={p.index > 0}
        canForward={p.index < frames.length - 1}
        playing={p.playing}
        onTogglePlay={() => p.setPlaying(!p.playing)}
        speed={p.speed}
        onSpeed={p.setSpeed}
        position={frames.length ? `Step ${p.index + 1} of ${frames.length}` : undefined}
      />
      <p className="widget-caption" aria-live="polite">{frame?.say ?? 'Choose an operation and press Run. Reverse is the classic: watch the order of the three pointer moves.'}</p>
      <CodeBlock snippet={snippet.snippet} highlight={frame ? { ts: snippet.lines.ts[frame.line], py: snippet.lines.py[frame.line] } : undefined} />
    </WidgetFrame>
  )
}
