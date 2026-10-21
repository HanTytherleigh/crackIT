import { useMemo, useState } from 'react'
import { CodeBlock } from '../components/CodeBlock'
import { StepControls, useFrames, WidgetFrame } from './controls'
import { TreeSvg } from './TreeSvg'
import { traversalFrames, traversalSnippets, treeFromLevelOrder, type Order } from './treeTraversal'

const TREE = treeFromLevelOrder([8, 3, 10, 1, 6, null, 14, null, null, 4, 7, null, null, 13])
const orderLabel: Record<Order, string> = { pre: 'Pre-order', in: 'In-order', post: 'Post-order', bfs: 'Level order (BFS)' }

export default function TreeTraversal() {
  const [order, setOrder] = useState<Order>('in')
  const frames = useMemo(() => traversalFrames(TREE, order), [order])
  const p = useFrames(frames.length, order)
  const f = frames[p.index]!
  const pending = new Set(f.pending)
  const visited = new Set(f.visited)
  const value = (id: number) => TREE[id]!.value
  const snippet = traversalSnippets[order]
  const isBfs = order === 'bfs'

  return (
    <WidgetFrame title="Tree traversals">
      <label className="small inline-field">
        Traversal
        <select className="select" value={order} onChange={(e) => setOrder(e.target.value as Order)}>
          {(Object.keys(orderLabel) as Order[]).map((o) => <option key={o} value={o}>{orderLabel[o]}</option>)}
        </select>
      </label>

      <TreeSvg
        label={`Binary search tree. Visited so far: ${f.visited.map(value).join(', ') || 'none'}`}
        nodes={TREE.map((n) => ({
          slot: n.slot,
          label: n.value,
          className: f.current === n.id ? 'is-current' : visited.has(n.id) ? 'is-visited' : pending.has(n.id) ? 'is-pending' : '',
        }))}
      />

      <div className="trav-panels">
        <div>
          <span className="small muted">{isBfs ? 'Queue (front first)' : 'Call stack (bottom first)'}</span>
          <ol className="call-frames" aria-label={`${isBfs ? 'Queue' : 'Stack'}: ${f.pending.map(value).join(', ') || 'empty'}`}>
            {f.pending.length === 0 && <li className="stack-empty" aria-hidden="true">empty</li>}
            {f.pending.map((id, i) => (
              <li key={`${id}-${i}`} className={`call-frame${(isBfs ? i === 0 : i === f.pending.length - 1) ? ' is-top' : ''}`} aria-hidden="true">{value(id)}</li>
            ))}
          </ol>
        </div>
        <div>
          <span className="small muted">Visit order</span>
          <ol className="visit-order" aria-label={`Visit order: ${f.visited.map(value).join(', ') || 'none yet'}`}>
            {f.visited.map((id) => <li key={id} aria-hidden="true">{value(id)}</li>)}
          </ol>
        </div>
      </div>

      <StepControls
        onReset={() => { p.setPlaying(false); p.setIndex(0) }}
        onBack={() => p.setIndex(Math.max(0, p.index - 1))}
        onForward={() => p.setIndex(Math.min(frames.length - 1, p.index + 1))}
        canBack={p.index > 0}
        canForward={p.index < frames.length - 1}
        playing={p.playing}
        onTogglePlay={() => p.setPlaying(!p.playing)}
        speed={p.speed}
        onSpeed={p.setSpeed}
        position={`Step ${p.index + 1} of ${frames.length}`}
      />
      <p className="widget-caption" aria-live="polite">{f.say}</p>
      <CodeBlock snippet={snippet.snippet} highlight={{ ts: snippet.lines.ts[f.line], py: snippet.lines.py[f.line] }} />
    </WidgetFrame>
  )
}
