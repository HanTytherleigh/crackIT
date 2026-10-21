import { useState } from 'react'
import { CodeBlock } from '../components/CodeBlock'
import { StepControls, useFrames, WidgetFrame } from './controls'
import { heapSnippets, popFrames, pushFrames, type HeapFrame } from './heap'
import { TreeSvg } from './TreeSvg'

const START = [2, 5, 3, 9, 6, 8, 4]
// A fixed sequence, so the first push (1) climbs all the way to the root.
const PUSH_VALUES = [1, 12, 4, 15, 7, 2, 10, 6, 3, 11, 5, 8, 13, 9]
const MAX = 15

type Run = { id: number; kind: 'push' | 'pop'; frames: HeapFrame[] }

export default function Heap() {
  const [base, setBase] = useState(START)
  const [run, setRun] = useState<Run | null>(null)
  const [popped, setPopped] = useState<number[]>([])
  const [pushes, setPushes] = useState(0)
  const frames = run?.frames ?? []
  const p = useFrames(frames.length || 1, run?.id ?? 0)
  const frame = frames[p.index]
  const heap = frame?.heap ?? base
  const active = new Set(frame?.active ?? [])
  const current = frames.length ? frames.at(-1)!.heap : base
  const nextValue = PUSH_VALUES[pushes % PUSH_VALUES.length]!

  function start(kind: Run['kind']) {
    // Each operation starts from where the previous one finished.
    const from = current
    setBase(from)
    const newFrames = kind === 'push' ? pushFrames(from, nextValue) : popFrames(from)
    if (kind === 'pop' && from.length) setPopped((ps) => [...ps, from[0]!])
    if (kind === 'push') setPushes((n) => n + 1)
    setRun({ id: (run?.id ?? 0) + 1, kind, frames: newFrames })
  }

  const snippet = heapSnippets[run?.kind ?? 'push']
  const swapping = frame?.line === 'swap-up' || frame?.line === 'swap-down'

  return (
    <WidgetFrame title="Heap">
      <div className="button-row">
        <button type="button" className="btn btn-primary" disabled={current.length >= MAX} onClick={() => start('push')}>Push {nextValue}</button>
        <button type="button" className="btn" disabled={current.length === 0} onClick={() => start('pop')}>Pop min</button>
      </div>

      <TreeSvg
        label={`Min-heap as a tree. Root ${heap[0] ?? 'empty'}.`}
        nodes={heap.map((v, i) => ({ slot: i, label: v, className: active.has(i) ? (swapping ? 'is-current' : 'is-moving') : i === 0 ? 'is-visited' : '' }))}
      />
      <ol className="cells heap-array" aria-label={`Same heap as an array: ${heap.join(', ') || 'empty'}`}>
        {heap.map((v, i) => (
          <li key={i} className={`cell${active.has(i) ? ' is-mid' : ''}`} aria-hidden="true">
            <span className="cell-tag">{i === 0 ? 'root' : ''}</span>
            <span className="cell-val">{v}</span>
            <span className="cell-idx">{i}</span>
          </li>
        ))}
      </ol>
      <p className="small muted">Children of index i sit at 2i + 1 and 2i + 2; its parent is at (i − 1) // 2. No pointers needed.</p>
      {popped.length > 0 && <p className="small">Popped so far: <strong>{popped.join(', ')}</strong></p>}

      <StepControls
        onReset={() => {
          p.setPlaying(false)
          setRun(null)
          setBase(START)
          setPopped([])
          setPushes(0)
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
      <p className="widget-caption" aria-live="polite">{frame?.say ?? 'Push a small value to watch it sift up, or pop the minimum to watch the replacement sift down.'}</p>
      <CodeBlock snippet={snippet.snippet} highlight={frame ? { ts: snippet.lines.ts[frame.line], py: snippet.lines.py[frame.line] } : undefined} />
    </WidgetFrame>
  )
}
