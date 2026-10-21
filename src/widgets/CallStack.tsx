import { useMemo, useState } from 'react'
import { CodeBlock } from '../components/CodeBlock'
import { StepControls, useFrames, WidgetFrame } from './controls'
import { callFrames, callSnippets, layoutTree, type CallNode, type Fn } from './callStack'

const W = 340
const ROW = 40

export default function CallStack() {
  const [fn, setFn] = useState<Fn>('fib')
  const [n, setN] = useState(5)
  const [memo, setMemo] = useState(false)
  const useMemoFor = fn === 'fib' && memo
  const frames = useMemo(() => callFrames(fn, n, useMemoFor), [fn, n, useMemoFor])
  const p = useFrames(frames.length, `${fn}-${n}-${useMemoFor}`)
  const f = frames[p.index]!
  const final = frames.at(-1)!

  // Lay out the whole tree once, so nodes don't jump as calls appear.
  const xs = useMemo(() => layoutTree(final.nodes), [final])
  const maxDepth = Math.max(...final.nodes.map((x) => x.depth))
  const H = (maxDepth + 1) * ROW + 12
  const pos = (node: CallNode) => ({ x: 14 + xs.get(node.id)! * (W - 28), y: 18 + node.depth * ROW })
  const label = (k: number) => (fn === 'fib' ? `fib(${k})` : `fact(${k})`)
  const onStack = new Set(f.stack)
  const snippet = fn === 'factorial' ? callSnippets.factorial : useMemoFor ? callSnippets.fibMemo : callSnippets.fib
  const repeats = f.nodes.filter((x) => x.repeat && !useMemoFor).length

  return (
    <WidgetFrame title="Recursion call stack">
      <div className="op-form">
        <label className="small inline-field">
          <span className="visually-hidden">Function</span>
          <select className="select" aria-label="Function" value={fn} onChange={(e) => { const v = e.target.value as Fn; setFn(v); setN(v === 'fib' ? 5 : 4) }}>
            <option value="factorial">Factorial</option>
            <option value="fib">Fibonacci</option>
          </select>
        </label>
        <label className="small inline-field">
          n
          <select className="select" value={n} onChange={(e) => setN(Number(e.target.value))}>
            {(fn === 'fib' ? [2, 3, 4, 5, 6] : [1, 2, 3, 4, 5, 6]).map((v) => <option key={v} value={v}>{v}</option>)}
          </select>
        </label>
        {fn === 'fib' && (
          <label className="toggle small inline-toggle">
            <input type="checkbox" checked={memo} onChange={(e) => setMemo(e.target.checked)} />
            <span>Memo</span>
          </label>
        )}
      </div>

      <svg className="plot" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Recursion tree with ${f.nodes.length} calls so far${repeats ? `, ${repeats} of them repeated work` : ''}`}>
        {f.nodes.map((node) => {
          if (node.parent === null) return null
          const a = pos(f.nodes[node.parent]!)
          const b = pos(node)
          return <line key={`e${node.id}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} className="tree-edge" />
        })}
        {f.nodes.map((node) => {
          const at = pos(node)
          const cls = onStack.has(node.id) ? 'is-active' : node.status === 'cached' ? 'is-cached' : node.repeat && !useMemoFor ? 'is-repeat' : 'is-done'
          return (
            <g key={node.id} className={`call-node ${cls}${f.stack.at(-1) === node.id ? ' is-top' : ''}`}>
              <circle cx={at.x} cy={at.y} r={12} />
              <text x={at.x} y={at.y + 4} textAnchor="middle">{node.arg}</text>
            </g>
          )
        })}
      </svg>
      <p className="small legend-row" aria-hidden="true">
        <span className="legend-item"><span className="legend-dot is-active" />on the stack</span>
        <span className="legend-item"><span className="legend-dot is-done" />returned</span>
        {fn === 'fib' && !useMemoFor && <span className="legend-item"><span className="legend-dot is-repeat" />repeated work</span>}
        {useMemoFor && <span className="legend-item"><span className="legend-dot is-cached" />memo hit</span>}
      </p>

      <div className="call-stack-panel">
        <span className="small muted">Call stack (top first) · calls so far: <strong>{f.calls}</strong></span>
        <ol className="call-frames" aria-label={`Call stack, top first: ${[...f.stack].reverse().map((id) => label(f.nodes[id]!.arg)).join(', ') || 'empty'}`}>
          {f.stack.length === 0 && <li className="stack-empty" aria-hidden="true">empty</li>}
          {[...f.stack].reverse().map((id, i) => (
            <li key={id} className={`call-frame${i === 0 ? ' is-top' : ''}`} aria-hidden="true">{label(f.nodes[id]!.arg)}</li>
          ))}
        </ol>
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
