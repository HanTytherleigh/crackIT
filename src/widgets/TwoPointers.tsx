import { useMemo, useState } from 'react'
import { CodeBlock } from '../components/CodeBlock'
import { pairSnippet, pairSumFrames, slidingWindowFrames, windowSnippet } from './twoPointers'
import { StepControls, useFrames, WidgetFrame } from './controls'

const SORTED = [1, 2, 4, 6, 8, 9, 11, 14]
const TARGETS = [15, 13, 20, 4]
const WINDOW_VALUES = [2, 1, 5, 1, 3, 2, 6, 1]

export default function TwoPointers() {
  const [mode, setMode] = useState<'pair' | 'window'>('pair')
  return (
    <WidgetFrame title="Two pointers and sliding window">
      <div className="mode-tabs" role="group" aria-label="Mode">
        <button type="button" aria-pressed={mode === 'pair'} onClick={() => setMode('pair')}>Pair sum</button>
        <button type="button" aria-pressed={mode === 'window'} onClick={() => setMode('window')}>Sliding window</button>
      </div>
      {mode === 'pair' ? <PairSum /> : <SlidingWindow />}
    </WidgetFrame>
  )
}

function PairSum() {
  const [target, setTarget] = useState(15)
  const frames = useMemo(() => pairSumFrames(SORTED, target), [target])
  const p = useFrames(frames.length, target)
  const f = frames[p.index]!

  return (
    <div className="stack">
      <label className="small inline-field">
        Target sum
        <select className="select" value={target} onChange={(e) => setTarget(Number(e.target.value))}>
          {TARGETS.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </label>
      <ol className="cells" aria-label="Sorted list">
        {SORTED.map((v, i) => {
          const tags = [i === f.left && 'L', i === f.right && 'R'].filter(Boolean).join(' ')
          const out = i < f.left || i > f.right
          return (
            <li key={i} className={`cell${out ? ' is-out' : ''}${tags ? ' is-mid' : ''}${f.found && tags ? ' is-found' : ''}`} aria-label={`Index ${i}, value ${v}${tags ? `, pointer ${tags}` : ''}${out ? ', ruled out' : ''}`}>
              <span className="cell-tag" aria-hidden="true">{tags}</span>
              <span className="cell-val" aria-hidden="true">{v}</span>
              <span className="cell-idx" aria-hidden="true">{i}</span>
            </li>
          )
        })}
      </ol>
      <p className="small range-labels">
        <span>Sum: <strong>{f.sum ?? '—'}</strong> / target {target}</span>
        <span>Checks: <strong>{f.checks}</strong> (all pairs: {(SORTED.length * (SORTED.length - 1)) / 2})</span>
      </p>
      <Controls p={p} count={frames.length} />
      <p className="widget-caption" aria-live="polite">{f.say}</p>
      <CodeBlock snippet={pairSnippet.snippet} highlight={{ ts: pairSnippet.lines.ts[f.line], py: pairSnippet.lines.py[f.line] }} />
    </div>
  )
}

function SlidingWindow() {
  const [k, setK] = useState(3)
  const frames = useMemo(() => slidingWindowFrames(WINDOW_VALUES, k), [k])
  const p = useFrames(frames.length, k)
  const f = frames[p.index]!

  return (
    <div className="stack">
      <label className="small inline-field">
        Window size k
        <select className="select" value={k} onChange={(e) => setK(Number(e.target.value))}>
          {[2, 3, 4].map((v) => <option key={v} value={v}>{v}</option>)}
        </select>
      </label>
      <ol className="cells" aria-label="Values">
        {WINDOW_VALUES.map((v, i) => {
          const inWindow = i >= f.start && i <= f.end
          const isEntering = f.line === 'slide' && i === f.end
          const isLeaving = f.line === 'slide' && i === f.start - 1
          return (
            <li
              key={i}
              className={`cell${inWindow ? ' in-window' : ' is-out'}${isEntering ? ' is-mid' : ''}${isLeaving ? ' is-leaving' : ''}${f.line === 'done' && inWindow ? ' is-found' : ''}`}
              aria-label={`Index ${i}, value ${v}${inWindow ? ', in window' : ''}${isEntering ? ', entering' : ''}${isLeaving ? ', leaving' : ''}`}
            >
              <span className="cell-tag" aria-hidden="true">{isEntering ? '+' : isLeaving ? '−' : ''}</span>
              <span className="cell-val" aria-hidden="true">{v}</span>
              <span className="cell-idx" aria-hidden="true">{i}</span>
            </li>
          )
        })}
      </ol>
      <p className="small range-labels">
        <span>Window sum: <strong>{f.sum}</strong> · best <strong>{f.best}</strong></span>
        <span>Operations: <strong>{f.ops}</strong> (from scratch: {(WINDOW_VALUES.length - k + 1) * k})</span>
      </p>
      <Controls p={p} count={frames.length} />
      <p className="widget-caption" aria-live="polite">{f.say}</p>
      <CodeBlock snippet={windowSnippet.snippet} highlight={{ ts: windowSnippet.lines.ts[f.line], py: windowSnippet.lines.py[f.line] }} />
    </div>
  )
}

function Controls({ p, count }: { p: ReturnType<typeof useFrames>; count: number }) {
  return (
    <StepControls
      onReset={() => {
        p.setPlaying(false)
        p.setIndex(0)
      }}
      onBack={() => p.setIndex(Math.max(0, p.index - 1))}
      onForward={() => p.setIndex(Math.min(count - 1, p.index + 1))}
      canBack={p.index > 0}
      canForward={p.index < count - 1}
      playing={p.playing}
      onTogglePlay={() => p.setPlaying(!p.playing)}
      speed={p.speed}
      onSpeed={p.setSpeed}
      position={`Step ${p.index + 1} of ${count}`}
    />
  )
}
