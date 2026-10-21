import { useEffect, useMemo, useState } from 'react'
import type { BigOClass, ComplexityDrill, ComplexityItem } from '../content/schema'
import { CodeBlock } from '../components/CodeBlock'
import { Prose } from '../components/Prose'
import { countSteps, trace } from './complexityModels'
import { StepControls, useFrames, WidgetFrame } from './controls'

const classLabel: Record<BigOClass, string> = {
  '1': 'O(1)',
  'log n': 'O(log n)',
  n: 'O(n)',
  'n log n': 'O(n log n)',
  'n^2': 'O(n²)',
  'n^3': 'O(n³)',
}
const TRACE_N = 4
const TABLE_NS = [4, 8, 16]

export default function ComplexityReader() {
  const [drill, setDrill] = useState<ComplexityDrill | null>(null)
  const [at, setAt] = useState(0)

  useEffect(() => {
    // The drill file is its own lazily loaded chunk, validated at build time.
    let live = true
    import('../../content/drills/complexity-reading.json').then((m) => live && setDrill(m.default as unknown as ComplexityDrill))
    return () => {
      live = false
    }
  }, [])

  if (!drill) return <WidgetFrame title="Complexity reader"><p className="muted" role="status">Loading snippets…</p></WidgetFrame>
  const item = drill.items[at]!

  return (
    <WidgetFrame title="Complexity reader">
      <div className="reader-nav">
        <button type="button" className="btn" disabled={at === 0} onClick={() => setAt(at - 1)}>Previous</button>
        <span className="small" aria-live="polite">Snippet {at + 1} of {drill.items.length}</span>
        <button type="button" className="btn" disabled={at === drill.items.length - 1} onClick={() => setAt(at + 1)}>Next</button>
      </div>
      {/* Keyed so each snippet starts fresh, with nothing revealed. */}
      <ReaderItem key={item.id} item={item} />
    </WidgetFrame>
  )
}

function ReaderItem({ item }: { item: ComplexityItem }) {
  const [bigO, setBigO] = useState<BigOClass | null>(null)
  const [dominant, setDominant] = useState<number | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [revealed, setRevealed] = useState(false)

  const bigOOk = bigO === item.answer
  const domOk = dominant === item.dominant.answer
  const done = submitted && ((bigOOk && domOk) || revealed)

  return (
    <div className="stack">
      <h3 className="reader-title">
        {item.title}
        {item.trap && done && <span className="badge trap-badge">Trap</span>}
      </h3>
      {done ? <TracedCode item={item} /> : <CodeBlock snippet={item.snippet} />}

      <fieldset className="chip-group" disabled={done}>
        <legend>What is the Big O?</legend>
        {(Object.keys(classLabel) as BigOClass[]).map((c) => (
          <label key={c} className="chip">
            <input type="radio" name={`${item.id}-bigo`} checked={bigO === c} onChange={() => { setBigO(c); setSubmitted(false) }} />
            <span>{classLabel[c]}</span>
          </label>
        ))}
      </fieldset>
      <fieldset className="chip-group" disabled={done}>
        <legend>Which term dominates the step count?</legend>
        {item.dominant.options.map((o, i) => (
          <label key={i} className="chip">
            <input type="radio" name={`${item.id}-dom`} checked={dominant === i} onChange={() => { setDominant(i); setSubmitted(false) }} />
            <span>{o}</span>
          </label>
        ))}
      </fieldset>

      {!done && (
        <div className="button-row">
          <button type="button" className="btn btn-primary" disabled={bigO === null || dominant === null} onClick={() => setSubmitted(true)}>
            Check my reading
          </button>
          {submitted && <button type="button" className="btn btn-quiet" onClick={() => setRevealed(true)}>Show the answer</button>}
        </div>
      )}

      <div aria-live="polite">
        {submitted && !done && (
          <p className="feedback feedback-retry">
            {bigOOk ? 'The Big O is right, but look again at the dominant term.' : domOk ? 'The dominant term is right. What does it simplify to?' : 'Not quite. Check whether the loops are nested or one after the other, and what each range depends on.'}
          </p>
        )}
        {done && (
          <p className={`feedback ${bigOOk && domOk ? 'feedback-ok' : 'feedback-reveal'}`}>
            {bigOOk && domOk ? 'Correct.' : 'Answer:'} {classLabel[item.answer]}, dominated by {item.dominant.options[item.dominant.answer]}.
          </p>
        )}
      </div>

      {done && (
        <>
          <CountTable item={item} />
          <Prose text={item.explanation} className="explanation" />
        </>
      )}
    </div>
  )
}

/** Steps through the snippet for n = 4, highlighting the line being run and counting the work. */
function TracedCode({ item }: { item: ComplexityItem }) {
  const events = useMemo(() => trace(item.model, TRACE_N, item.params ?? {}), [item])
  const frames = events.length + 1 // frame 0 is "before running"
  const { index, setIndex, playing, setPlaying, speed, setSpeed } = useFrames(frames, item.id)
  const ev = index === 0 ? undefined : events[index - 1]
  const vars = ev ? Object.entries(ev.vars).map(([k, v]) => `${k} = ${v}`).join(', ') : ''

  return (
    <div className="stack">
      <CodeBlock
        snippet={item.snippet}
        highlight={ev ? { ts: item.lines.ts[ev.line], py: item.lines.py[ev.line] } : undefined}
        label={`n = ${TRACE_N}`}
      />
      <StepControls
        onReset={() => {
          setPlaying(false)
          setIndex(0)
        }}
        onBack={() => setIndex(Math.max(0, index - 1))}
        onForward={() => setIndex(Math.min(frames - 1, index + 1))}
        canBack={index > 0}
        canForward={index < frames - 1}
        playing={playing}
        onTogglePlay={() => setPlaying(!playing)}
        speed={speed}
        onSpeed={setSpeed}
        position={`${index} / ${frames - 1}`}
      />
      <p className="widget-caption trace-caption" aria-live="polite">
        {ev ? <>Counted steps: <strong>{ev.count}</strong>{vars && <span className="muted"> ({vars})</span>}</> : `Press play or step to run it with n = ${TRACE_N}.`}
      </p>
    </div>
  )
}

function CountTable({ item }: { item: ComplexityItem }) {
  const counts = TABLE_NS.map((n) => countSteps(item.model, n, item.params ?? {}))
  return (
    <div className="table-wrap" role="region" aria-label="Step counts" tabIndex={0}>
      <table>
        <thead>
          <tr>
            <th scope="col">n</th>
            <th scope="col">Steps</th>
            <th scope="col">When n doubles</th>
          </tr>
        </thead>
        <tbody>
          {TABLE_NS.map((n, i) => (
            <tr key={n}>
              <td>{n}</td>
              <td>{counts[i]!.toLocaleString('en-GB')}</td>
              <td>{i === 0 ? '—' : `×${(counts[i]! / counts[i - 1]!).toLocaleString('en-GB', { maximumFractionDigits: 2 })}`}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
