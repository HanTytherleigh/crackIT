import { useMemo, useState } from 'react'
import { CodeBlock } from '../components/CodeBlock'
import { StepControls, useFrames, WidgetFrame } from './controls'
import {
  bracketFrames,
  bracketSnippet,
  dequeue,
  emptyQueue,
  enqueue,
  queueSnippet,
  queueValues,
  stackSnippet,
  tailIndex,
  type RingQueue,
  type SQLine,
} from './stackQueue'

type Mode = 'stack' | 'queue' | 'brackets'
const BRACKET_EXAMPLES = ['{[()()]}', '([)]', '((()', '(a[b]{c})']

export default function StackQueue() {
  const [mode, setMode] = useState<Mode>('stack')
  return (
    <WidgetFrame title="Stack and queue">
      <div className="mode-tabs" role="group" aria-label="Mode">
        <button type="button" aria-pressed={mode === 'stack'} onClick={() => setMode('stack')}>Stack</button>
        <button type="button" aria-pressed={mode === 'queue'} onClick={() => setMode('queue')}>Queue</button>
        <button type="button" aria-pressed={mode === 'brackets'} onClick={() => setMode('brackets')}>Brackets</button>
      </div>
      {mode === 'stack' ? <StackMode /> : mode === 'queue' ? <QueueMode /> : <BracketMode />}
    </WidgetFrame>
  )
}

/**
 * Stack and queue modes record each operation as a history entry. Back and forward step
 * through that history (undo and redo); a new operation drops any undone future.
 */
function useHistory<T>(initial: T) {
  const [entries, setEntries] = useState<{ state: T; say: string; line?: SQLine; active?: number }[]>([{ state: initial, say: '' }])
  const p = useFrames(entries.length, 'history')
  const current = entries[Math.min(p.index, entries.length - 1)]!
  function record(state: T, say: string, line?: SQLine, active?: number) {
    const kept = entries.slice(0, p.index + 1)
    setEntries([...kept, { state, say, line, active }])
    p.setIndex(kept.length)
  }
  function reset() {
    p.setPlaying(false)
    setEntries([{ state: initial, say: '' }])
    p.setIndex(0)
  }
  return { current, record, reset, p, count: entries.length }
}

function History<T>({ h, empty }: { h: ReturnType<typeof useHistory<T>>; empty: string }) {
  return (
    <>
      <StepControls
        onReset={h.reset}
        onBack={() => h.p.setIndex(Math.max(0, h.p.index - 1))}
        onForward={() => h.p.setIndex(Math.min(h.count - 1, h.p.index + 1))}
        canBack={h.p.index > 0}
        canForward={h.p.index < h.count - 1}
        backLabel="Undo"
        forwardLabel="Redo"
        playing={h.p.playing}
        onTogglePlay={() => {
          if (!h.p.playing && h.p.index >= h.count - 1) h.p.setIndex(0)
          h.p.setPlaying(!h.p.playing)
        }}
        speed={h.p.speed}
        onSpeed={h.p.setSpeed}
        position={h.count > 1 ? `${h.p.index} of ${h.count - 1} operations` : undefined}
      />
      <p className="widget-caption" aria-live="polite">{h.current.say || empty}</p>
    </>
  )
}

function StackMode() {
  const h = useHistory<number[]>([])
  const stack = h.current.state
  const next = 10 + ((h.count * 17) % 80)

  return (
    <div className="stack">
      <div className="button-row">
        <button type="button" className="btn btn-primary" disabled={stack.length >= 6} onClick={() => h.record([...stack, next], `Push ${next} on top. Only the top is touched: O(1).`, 'push', stack.length)}>
          Push {next}
        </button>
        <button type="button" className="btn" disabled={stack.length === 0} onClick={() => h.record(stack.slice(0, -1), `Pop ${stack.at(-1)} from the top: the last one in is the first one out.`, 'pop')}>
          Pop
        </button>
      </div>
      <ol className="stack-view" aria-label={`Stack, top first: ${[...stack].reverse().join(', ') || 'empty'}`}>
        {stack.length === 0 && <li className="stack-empty" aria-hidden="true">empty</li>}
        {[...stack].reverse().map((v, i) => (
          <li key={stack.length - i} className={`stack-item${i === 0 ? ' is-top' : ''}`} aria-hidden="true">
            {v}
            {i === 0 && <span className="stack-tag">top</span>}
          </li>
        ))}
      </ol>
      <History h={h} empty="Push a few values, then pop: they come back out in reverse order." />
      <CodeBlock snippet={stackSnippet.snippet} highlight={h.current.line ? { ts: stackSnippet.lines.ts[h.current.line], py: stackSnippet.lines.py[h.current.line] } : undefined} />
    </div>
  )
}

function QueueMode() {
  const h = useHistory<RingQueue>(emptyQueue(8))
  const q = h.current.state
  const next = 10 + ((h.count * 17) % 80)
  const tail = tailIndex(q)

  return (
    <div className="stack">
      <div className="button-row">
        <button
          type="button"
          className="btn btn-primary"
          disabled={q.size === q.slots.length}
          onClick={() => {
            const r = enqueue(q, next)
            h.record(r.queue, `Enqueue ${next} at the back (slot ${r.at}). The back index wraps around to the start when it runs off the end.`, 'enqueue', r.at)
          }}
        >
          Enqueue {next}
        </button>
        <button
          type="button"
          className="btn"
          disabled={q.size === 0}
          onClick={() => {
            const r = dequeue(q)
            h.record(r.queue, `Dequeue ${r.value} from the front (slot ${r.at}). Nothing shifts: the front index just moves on. O(1).`, 'dequeue', r.at)
          }}
        >
          Dequeue
        </button>
      </div>
      <ol className="cells" aria-label={`Queue, front first: ${queueValues(q).join(', ') || 'empty'}`}>
        {q.slots.map((v, i) => {
          const tags = [q.size > 0 && i === q.head && 'front', q.size < q.slots.length && i === tail && 'back'].filter(Boolean).join(' ')
          return (
            <li key={i} className={`cell${v === null ? ' is-free' : ''}${h.current.active === i ? ' is-mid' : ''}`} aria-hidden="true">
              <span className="cell-tag">{tags}</span>
              <span className="cell-val">{v ?? ''}</span>
              <span className="cell-idx">{i}</span>
            </li>
          )
        })}
      </ol>
      <History h={h} empty="Enqueue several values, dequeue a few, then keep enqueuing: watch the back wrap round to slot 0." />
      <CodeBlock snippet={queueSnippet.snippet} highlight={h.current.line ? { ts: queueSnippet.lines.ts[h.current.line], py: queueSnippet.lines.py[h.current.line] } : undefined} />
    </div>
  )
}

function BracketMode() {
  const [input, setInput] = useState(BRACKET_EXAMPLES[0]!)
  const frames = useMemo(() => bracketFrames(input), [input])
  const p = useFrames(frames.length, input)
  const f = frames[p.index]!

  return (
    <div className="stack">
      <p className="small muted">Checking brackets is a stack problem in disguise: the most recently opened bracket must close first.</p>
      <label className="small inline-field">
        Input
        <select className="select mono" value={input} onChange={(e) => setInput(e.target.value)}>
          {BRACKET_EXAMPLES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </label>
      <p className="bracket-input" aria-label={`Reading character ${Math.min(f.index + 1, input.length)} of ${input.length}`}>
        {[...input].map((ch, i) => (
          <span key={i} className={i === f.index ? (f.verdict === false ? 'is-bad' : 'is-mid') : i < f.index ? 'is-done' : ''}>{ch}</span>
        ))}
      </p>
      <ol className="stack-view stack-view-row" aria-label={`Stack, top first: ${[...f.stack].reverse().join(' ') || 'empty'}`}>
        {f.stack.length === 0 && <li className="stack-empty" aria-hidden="true">empty</li>}
        {[...f.stack].reverse().map((v, i) => (
          <li key={i} className={`stack-item${i === 0 ? ' is-top' : ''}`} aria-hidden="true">{v}</li>
        ))}
      </ol>
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
      <p className={`widget-caption${f.verdict === true ? ' is-ok' : f.verdict === false ? ' is-bad' : ''}`} aria-live="polite">{f.say}</p>
      <CodeBlock snippet={bracketSnippet.snippet} highlight={{ ts: bracketSnippet.lines.ts[f.line], py: bracketSnippet.lines.py[f.line] }} />
    </div>
  )
}
