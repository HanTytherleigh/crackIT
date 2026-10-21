import { useMemo, useRef, useState, type PointerEvent } from 'react'
import { CodeBlock } from '../components/CodeBlock'
import { StepControls, useFrames, WidgetFrame } from './controls'
import { edgeKey, graphSnippets, presetGraph, searchFrames, type Algo, type GNode, type Graph } from './graph'

const W = 340
const H = 240
const R = 16
const MAX_NODES = 10
const LABELS = 'ABCDEFGHIJ'
const algoLabel: Record<Algo, string> = { bfs: 'BFS', dfs: 'DFS', path: 'Shortest path' }
// Spots for nodes added with the button rather than by tapping.
const SLOTS: [number, number][] = [[40, 40], [170, 40], [300, 40], [90, 120], [250, 120], [40, 200], [170, 200], [300, 200], [170, 120], [105, 200]]

export default function GraphWidget() {
  const [graph, setGraph] = useState<Graph>(presetGraph)
  const [selected, setSelected] = useState<number | null>(null)
  const [algo, setAlgo] = useState<Algo>('bfs')
  const [start, setStart] = useState(0)
  const [target, setTarget] = useState(6)
  const [run, setRun] = useState<{ id: number; algo: Algo } | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)

  const frames = useMemo(
    () => (run && graph.nodes.some((n) => n.id === start) ? searchFrames(graph, run.algo, start, target) : []),
    [run, graph, start, target],
  )
  const p = useFrames(frames.length || 1, run?.id ?? 0)
  const f = run ? frames[p.index] : undefined
  const editing = !run
  const label = (id: number) => graph.nodes.find((n) => n.id === id)?.label ?? '?'

  function addNode(x: number, y: number) {
    if (graph.nodes.length >= MAX_NODES) return
    const id = Math.max(-1, ...graph.nodes.map((n) => n.id)) + 1
    const used = new Set(graph.nodes.map((n) => n.label))
    const name = [...LABELS].find((l) => !used.has(l))!
    setGraph({ ...graph, nodes: [...graph.nodes, { id, label: name, x, y }] })
  }

  function tapNode(id: number) {
    if (!editing) return
    if (selected === null) return setSelected(id)
    if (selected === id) return setSelected(null)
    // Toggle the edge between the two tapped nodes.
    const key = edgeKey(selected, id)
    const exists = graph.edges.some(([a, b]) => edgeKey(a, b) === key)
    setGraph({ ...graph, edges: exists ? graph.edges.filter(([a, b]) => edgeKey(a, b) !== key) : [...graph.edges, [selected, id]] })
    setSelected(null)
  }

  function tapCanvas(e: PointerEvent<SVGSVGElement>) {
    if (!editing || e.target !== e.currentTarget) return
    const ctm = svgRef.current?.getScreenCTM()
    if (!ctm) return
    const pt = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse())
    const x = Math.min(W - R - 2, Math.max(R + 2, pt.x))
    const y = Math.min(H - R - 2, Math.max(R + 2, pt.y))
    if (graph.nodes.some((n) => Math.hypot(n.x - x, n.y - y) < R * 2.4)) return
    if (selected !== null) return setSelected(null)
    addNode(x, y)
  }

  function addNodeByButton() {
    const free = SLOTS.find(([x, y]) => !graph.nodes.some((n) => Math.hypot(n.x - x, n.y - y) < R * 2.4))
    if (free) addNode(free[0], free[1])
  }

  const visited = new Set(f?.visited ?? [])
  const frontier = new Set(f?.frontier ?? [])
  const pathEdges = new Set((f?.path ?? []).slice(1).map((id, i) => edgeKey(f!.path![i]!, id)))
  const treeEdges = new Set(Object.entries(f?.parent ?? {}).map(([c, par]) => edgeKey(Number(c), par)))
  const activeEdge = f?.edge ? edgeKey(f.edge[0], f.edge[1]) : null
  const snippet = graphSnippets[run?.algo === 'dfs' ? 'dfs' : 'bfs']
  const nodeClass = (n: GNode) =>
    f?.path?.includes(n.id) ? 'is-path' : f?.current === n.id ? 'is-current' : visited.has(n.id) ? 'is-visited' : frontier.has(n.id) ? 'is-pending' : selected === n.id ? 'is-selected' : ''

  return (
    <WidgetFrame title="Graph">
      {editing ? (
        <p className="small muted">Tap empty space to add a node. Tap two nodes to add or remove the edge between them.</p>
      ) : (
        <p className="small muted">Running {algoLabel[run.algo]} from {label(start)}{run.algo === 'path' ? ` to ${label(target)}` : ''}. Edit the graph to change it.</p>
      )}

      <svg
        ref={svgRef}
        className={`plot graph-svg${editing ? ' is-editing' : ''}`}
        viewBox={`0 0 ${W} ${H}`}
        onPointerUp={tapCanvas}
        role="group"
        aria-label={`Graph with ${graph.nodes.length} nodes and ${graph.edges.length} edges`}
      >
        {graph.edges.map(([a, b]) => {
          const na = graph.nodes.find((n) => n.id === a)
          const nb = graph.nodes.find((n) => n.id === b)
          if (!na || !nb) return null
          const key = edgeKey(a, b)
          const cls = pathEdges.has(key) ? 'is-path' : key === activeEdge ? 'is-active' : treeEdges.has(key) ? 'is-tree' : ''
          return <line key={key} x1={na.x} y1={na.y} x2={nb.x} y2={nb.y} className={`graph-edge ${cls}`} />
        })}
        {graph.nodes.map((n) => (
          <g
            key={n.id}
            className={`graph-node ${nodeClass(n)}`}
            role={editing ? 'button' : undefined}
            tabIndex={editing ? 0 : undefined}
            aria-label={`Node ${n.label}${selected === n.id ? ', selected' : ''}`}
            aria-pressed={editing ? selected === n.id : undefined}
            onPointerUp={(e) => { e.stopPropagation(); tapNode(n.id) }}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); tapNode(n.id) } }}
          >
            <circle cx={n.x} cy={n.y} r={R} />
            <text x={n.x} y={n.y + 5} textAnchor="middle">{n.label}</text>
            {f && f.dist[n.id] !== undefined && run?.algo !== 'dfs' && (
              <text x={n.x + R + 2} y={n.y - R + 4} className="graph-dist">{f.dist[n.id]}</text>
            )}
          </g>
        ))}
      </svg>

      {editing ? (
        <div className="stack">
          <div className="button-row">
            <button type="button" className="btn" onClick={addNodeByButton} disabled={graph.nodes.length >= MAX_NODES}>Add node</button>
            <button type="button" className="btn" onClick={() => { setGraph(presetGraph()); setSelected(null) }}>Example graph</button>
            <button type="button" className="btn" onClick={() => { setGraph({ nodes: [], edges: [] }); setSelected(null) }}>Clear</button>
          </div>
          <div className="op-form">
            <label className="small inline-field">
              <span className="visually-hidden">Algorithm</span>
              <select className="select" aria-label="Algorithm" value={algo} onChange={(e) => setAlgo(e.target.value as Algo)}>
                {(Object.keys(algoLabel) as Algo[]).map((a) => <option key={a} value={a}>{algoLabel[a]}</option>)}
              </select>
            </label>
            <label className="small inline-field">
              from
              <select className="select" value={start} onChange={(e) => setStart(Number(e.target.value))}>
                {graph.nodes.map((n) => <option key={n.id} value={n.id}>{n.label}</option>)}
              </select>
            </label>
            {algo === 'path' && (
              <label className="small inline-field">
                to
                <select className="select" value={target} onChange={(e) => setTarget(Number(e.target.value))}>
                  {graph.nodes.map((n) => <option key={n.id} value={n.id}>{n.label}</option>)}
                </select>
              </label>
            )}
            <button
              type="button"
              className="btn btn-primary"
              disabled={!graph.nodes.some((n) => n.id === start) || (algo === 'path' && (!graph.nodes.some((n) => n.id === target) || target === start))}
              onClick={() => { setSelected(null); setRun({ id: Date.now(), algo }) }}
            >
              Run
            </button>
          </div>
        </div>
      ) : (
        <div className="stack">
          <div className="trav-panels">
            <div>
              <span className="small muted">Frontier: {run.algo === 'dfs' ? 'stack (top last)' : 'queue (front first)'}</span>
              <ol className="call-frames" aria-label={`Frontier: ${f?.frontier.map(label).join(', ') || 'empty'}`}>
                {(f?.frontier.length ?? 0) === 0 && <li className="stack-empty" aria-hidden="true">empty</li>}
                {f?.frontier.map((id, i) => <li key={`${id}-${i}`} className="call-frame" aria-hidden="true">{label(id)}</li>)}
              </ol>
            </div>
            <div>
              <span className="small muted">Visited</span>
              <ol className="visit-order" aria-label={`Visited: ${f?.visited.map(label).join(', ') || 'none yet'}`}>
                {f?.visited.map((id) => <li key={id} aria-hidden="true">{label(id)}</li>)}
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
          <p className="widget-caption" aria-live="polite">{f?.say}</p>
          <button type="button" className="btn" onClick={() => { p.setPlaying(false); setRun(null) }}>Edit the graph</button>
          <CodeBlock snippet={snippet.snippet} highlight={f ? { ts: snippet.lines.ts[f.line], py: snippet.lines.py[f.line] } : undefined} />
        </div>
      )}
    </WidgetFrame>
  )
}
